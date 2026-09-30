export interface RunInput {
  cart: {
    buyerIdentity?: {
      customer?: {
        tags?: string[]
      }
    }
  }
}

export interface FunctionResult {
  discountApplicationStrategy: 'FIRST' | 'MAXIMUM'
  discounts: Array<{
    targets: Array<{ productVariant: { id: string } }>
    value: { percentage: { value: string } }
    message: string
  }>
}

export function runTribalDiscountFunction(input: RunInput): FunctionResult {
  const customer = input.cart.buyerIdentity?.customer
  const isTribalMember =
    customer?.tags?.includes('tribal-member-verified') ||
    customer?.tags?.includes('Tribal_Verified')

  if (!isTribalMember) {
    return {
      discountApplicationStrategy: 'FIRST',
      discounts: [],
    }
  }

  return {
    discountApplicationStrategy: 'FIRST',
    discounts: [
      {
        targets: [{ productVariant: { id: 'ALL_VARIANTS' } }],
        value: { percentage: { value: '20.0' } },
        message: 'Native American Tribal Member Commercial Discount (20% Off)',
      },
    ],
  }
}
