import { CartSidebarView } from '@components/cart'
import DynamicSEO from '@components/DynamicSEO'

const Cart = () => (
  <>
    <DynamicSEO
      title="Shopping Cart | DisplayCellPros"
      description="Review the items in your cart and proceed to secure checkout."
      noindex
    />
    <CartSidebarView />
  </>
)

export default Cart

