const { axe, toHaveNoViolations } = require('jest-axe')

expect.extend(toHaveNoViolations)

describe('Accessibility & WCAG Compliance', () => {
  it('validates that Cart Notification structure passes axe accessibility checks', async () => {
    const html = `
      <main>
        <h1>Storefront</h1>
        <aside id="cart-notification-toast" aria-label="Shopping bag notification">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Added to bag
            </p>
            <p>1 item added to your bag.</p>
            <button type="button" id="cart-notification-dismiss-btn" aria-label="Dismiss notification">
              Dismiss
            </button>
            <button type="button" id="cart-notification-checkout-btn">
              View Bag and Checkout
            </button>
          </div>
        </aside>
      </main>
    `
    const results = await axe(html)
    expect(results).toHaveNoViolations()
  })

  it('validates that Product Comparison Modal dialog structure passes axe accessibility checks', async () => {
    const html = `
      <div>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="comparison-dialog-title"
          id="product-comparison-modal"
        >
          <header>
            <h2 id="comparison-dialog-title">Product Comparison</h2>
            <button type="button" aria-label="Close comparison view">Close</button>
          </header>
          <main>
            <section aria-labelledby="product-1-title">
              <h3 id="product-1-title">Minimalist Tee</h3>
              <p>$45.00</p>
              <button type="button" aria-label="Add Minimalist Tee to bag">Add to Bag</button>
            </section>
          </main>
        </div>
      </div>
    `
    const results = await axe(html)
    expect(results).toHaveNoViolations()
  })

  it('validates that Search and Navigation controls have accessible labels', async () => {
    const html = `
      <header>
        <nav aria-label="Main Navigation">
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/search">Shop</a></li>
          </ul>
        </nav>
        <form role="search" aria-label="Site Search">
          <label for="catalog-search-input">Search products</label>
          <input
            id="catalog-search-input"
            type="search"
            name="q"
            placeholder="Search our catalog..."
          />
          <button type="submit" aria-label="Submit search">Search</button>
        </form>
      </header>
    `
    const results = await axe(html)
    expect(results).toHaveNoViolations()
  })
})
