/**
 * Cart reconciliation: makes the Shopify Storefront cart (the one checkout
 * uses) match the local CartContext items exactly.
 *
 * Every cart mutation queues one reconcile. The reconcile reads the latest
 * cart id and items (never a stale closure), fetches the remote cart, and adds,
 * updates or removes lines by variant id. That means removes always hit the
 * same cart checkout uses, even for lines whose Shopify line id was never
 * mapped locally, and leftover lines (for example a removed Trip Fee) are
 * dropped. An emptied cart drops its id so the next add starts a fresh cart.
 */

export type DesiredLine = { variantId: string; quantity: number }
export type RemoteLine = { id: string; variantId: string; quantity: number }

export type CartDiff = {
  add: Array<{ merchandiseId: string; quantity: number }>
  update: Array<{ id: string; quantity: number }>
  remove: string[]
}

export function remoteLinesFromCart(cart: any): RemoteLine[] {
  const edges = cart?.lines?.edges || []
  return edges
    .map((e: any) => e?.node)
    .filter((n: any) => n && n.id && n.merchandise?.id)
    .map((n: any) => ({ id: n.id, variantId: n.merchandise.id, quantity: Number(n.quantity) || 0 }))
}

/** Pure diff between what Shopify holds and what the shopper sees. */
export function diffCartLines(remote: RemoteLine[], desired: DesiredLine[]): CartDiff {
  const want = new Map<string, number>()
  for (const d of desired) {
    if (!d.variantId || d.quantity <= 0) continue
    want.set(d.variantId, (want.get(d.variantId) || 0) + d.quantity)
  }
  const diff: CartDiff = { add: [], update: [], remove: [] }
  const seen = new Set<string>()
  for (const line of remote) {
    const q = want.get(line.variantId)
    if (q === undefined || seen.has(line.variantId)) {
      // Not wanted, or a duplicate line for the same variant
      diff.remove.push(line.id)
      continue
    }
    seen.add(line.variantId)
    if (line.quantity !== q) diff.update.push({ id: line.id, quantity: q })
  }
  want.forEach((q, variantId) => {
    if (!seen.has(variantId)) diff.add.push({ merchandiseId: variantId, quantity: q })
  })
  return diff
}

export type CartApi = {
  fetchCart: (id: string) => Promise<{ ok?: boolean; data?: any }>
  createCart: (lines: Array<{ merchandiseId: string; quantity: number }>) => Promise<{ ok?: boolean; data?: any }>
  addLines: (id: string, lines: Array<{ merchandiseId: string; quantity: number }>) => Promise<{ ok?: boolean; data?: any }>
  updateLines: (id: string, lines: Array<{ id: string; quantity: number }>) => Promise<{ ok?: boolean; data?: any }>
  removeLines: (id: string, lineIds: string[]) => Promise<{ ok?: boolean; data?: any }>
}

export type ReconcileResult = {
  cartId: string | null
  checkoutUrl: string | null
  cart: any | null
}

function pickCart(res: any, key: string) {
  return res?.ok !== false ? res?.data?.[key]?.cart ?? null : null
}

/**
 * Brings the remote cart in line with `desired`. Returns the cart id and the
 * checkoutUrl from the latest Shopify response, which is the only checkoutUrl
 * checkout should ever use.
 */
export async function reconcileCart(
  api: CartApi,
  cartId: string | null,
  desired: DesiredLine[]
): Promise<ReconcileResult> {
  const wanted = desired.filter((d) => d.variantId && d.quantity > 0)
  if (wanted.length === 0) {
    // Empty bag: forget the cart so its id/checkoutUrl can never resurface.
    if (cartId) {
      try {
        const res = await api.fetchCart(cartId)
        const ids = remoteLinesFromCart(res?.data?.cart).map((l) => l.id)
        if (ids.length) await api.removeLines(cartId, ids)
      } catch {
        // best effort; the id is dropped either way
      }
    }
    return { cartId: null, checkoutUrl: null, cart: null }
  }

  const create = async (): Promise<ReconcileResult> => {
    const res = await api.createCart(diffCartLines([], wanted).add)
    const cart = pickCart(res, 'cartCreate')
    return cart
      ? { cartId: cart.id, checkoutUrl: cart.checkoutUrl, cart }
      : { cartId: null, checkoutUrl: null, cart: null }
  }

  if (!cartId) return create()

  const fetched = await api.fetchCart(cartId)
  let cart = fetched?.ok !== false ? fetched?.data?.cart ?? null : null
  if (!cart) return create() // expired or completed cart

  const diff = diffCartLines(remoteLinesFromCart(cart), wanted)
  if (diff.remove.length) cart = pickCart(await api.removeLines(cartId, diff.remove), 'cartLinesRemove') || cart
  if (diff.update.length) cart = pickCart(await api.updateLines(cartId, diff.update), 'cartLinesUpdate') || cart
  if (diff.add.length) cart = pickCart(await api.addLines(cartId, diff.add), 'cartLinesAdd') || cart

  // Verify; if Shopify still disagrees, start a clean cart rather than send
  // the shopper to checkout with the wrong lines.
  const check = diffCartLines(remoteLinesFromCart(cart), wanted)
  if (check.add.length || check.update.length || check.remove.length) {
    const refetched = await api.fetchCart(cartId)
    const fresh = refetched?.data?.cart
    const again = fresh ? diffCartLines(remoteLinesFromCart(fresh), wanted) : null
    if (!again || again.add.length || again.update.length || again.remove.length) return create()
    cart = fresh
  }
  return { cartId, checkoutUrl: cart.checkoutUrl, cart }
}
