import type { QAMatrixEvaluation, QAScenarioName } from './types.ts'
import { verifyTribalEnrollment } from './verification.ts'
import { calculateAvaTaxTribalQuote } from './avatax.ts'

export async function evaluateQAScenario(scenario: QAScenarioName): Promise<QAMatrixEvaluation> {
  switch (scenario) {
    case 'ENROLLED_ON_RESERVATION': {
      const verification = await verifyTribalEnrollment({
        customerId: 'cust_qa_1',
        firstName: 'Dine',
        lastName: 'Yazzie',
        tribalNation: 'Navajo Nation',
        tribalEnrollmentId: 'NAV-99281',
        shippingAddress: {
          address1: '100 BIA Route 12',
          city: 'Window Rock',
          province: 'AZ',
          zip: '86515',
        },
        certificate: {
          formType: 'GENERAL_TRIBAL_EXEMPTION',
          signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          carrierDeliveryMethod: 'COMMON_CARRIER',
          signedDate: '2026-09-23T12:00:00.000Z',
        },
      })

      const avatax = await calculateAvaTaxTribalQuote({
        transactionCode: 'QA-TX-1',
        customerId: 'cust_qa_1',
        customerEmail: 'dine@example.com',
        isTribalMember: verification.discountTrack.eligible,
        onReservation: verification.taxExemptionTrack.onReservation,
        shippingAddress: {
          line1: '100 BIA Route 12',
          city: 'Window Rock',
          region: 'AZ',
          postalCode: '86515',
          country: 'US',
        },
        lines: [{ number: '1', quantity: 1, amount: 100, taxCode: 'P0000000', itemCode: 'SCRN-1', description: 'Screen' }],
      })

      const discountApplied = verification.discountTrack.eligible && verification.discountTrack.discountPercentage === 20
      const taxExemptApplied = verification.taxExemptionTrack.taxExempt && avatax.isTaxExempt
      const entityUseCode = avatax.entityUseCode || null
      const customerTag = verification.customerTagApplied ? 'tribal-member-verified' : null

      const passed = discountApplied && taxExemptApplied && entityUseCode === 'C' && customerTag === 'tribal-member-verified'

      return {
        scenario: 'ENROLLED_ON_RESERVATION',
        description: 'Verified tribal member shipping to on-reservation address qualifies for both commercial 20% discount and statutory sales tax exemption with Entity Use Code C.',
        enrolled: true,
        onReservation: true,
        expectedDiscount: true,
        expectedDiscountPercent: 20,
        expectedTaxExempt: true,
        expectedEntityUseCode: 'C',
        expectedCustomerTag: 'tribal-member-verified',
        actualResults: {
          discountApplied,
          discountPercent: verification.discountTrack.discountPercentage,
          taxExemptApplied,
          entityUseCode,
          customerTag,
          passed,
        },
      }
    }

    case 'ENROLLED_OFF_RESERVATION': {
      const verification = await verifyTribalEnrollment({
        customerId: 'cust_qa_2',
        firstName: 'Sara',
        lastName: 'Begay',
        tribalNation: 'Navajo Nation',
        tribalEnrollmentId: 'NAV-44211',
        shippingAddress: {
          address1: '450 North Central Ave',
          city: 'Phoenix',
          province: 'AZ',
          zip: '85004',
        },
      })

      const avatax = await calculateAvaTaxTribalQuote({
        transactionCode: 'QA-TX-2',
        customerId: 'cust_qa_2',
        customerEmail: 'sara@example.com',
        isTribalMember: verification.discountTrack.eligible,
        onReservation: verification.taxExemptionTrack.onReservation,
        shippingAddress: {
          line1: '450 North Central Ave',
          city: 'Phoenix',
          region: 'AZ',
          postalCode: '85004',
          country: 'US',
        },
        lines: [{ number: '1', quantity: 1, amount: 100, taxCode: 'P0000000', itemCode: 'SCRN-1', description: 'Screen' }],
      })

      const discountApplied = verification.discountTrack.eligible && verification.discountTrack.discountPercentage === 20
      const taxExemptApplied = verification.taxExemptionTrack.taxExempt && avatax.isTaxExempt
      const entityUseCode = avatax.entityUseCode || null
      const customerTag = verification.customerTagApplied ? 'tribal-member-verified' : null

      const passed = discountApplied && !taxExemptApplied && entityUseCode === null && customerTag === 'tribal-member-verified'

      return {
        scenario: 'ENROLLED_OFF_RESERVATION',
        description: 'Verified tribal member shipping off-reservation receives 20% commercial discount but standard destination sales tax is charged.',
        enrolled: true,
        onReservation: false,
        expectedDiscount: true,
        expectedDiscountPercent: 20,
        expectedTaxExempt: false,
        expectedEntityUseCode: null,
        expectedCustomerTag: 'tribal-member-verified',
        actualResults: {
          discountApplied,
          discountPercent: verification.discountTrack.discountPercentage,
          taxExemptApplied,
          entityUseCode,
          customerTag,
          passed,
        },
      }
    }

    case 'NOT_ENROLLED_ON_RESERVATION': {
      const verification = await verifyTribalEnrollment({
        customerId: 'cust_qa_3',
        firstName: 'John',
        lastName: 'Doe',
        tribalNation: 'Unverified Tribe',
        tribalEnrollmentId: 'INVALID_ID_000',
        shippingAddress: {
          address1: '100 BIA Route 12',
          city: 'Window Rock',
          province: 'AZ',
          zip: '86515',
        },
      })

      const avatax = await calculateAvaTaxTribalQuote({
        transactionCode: 'QA-TX-3',
        customerId: 'cust_qa_3',
        customerEmail: 'john@example.com',
        isTribalMember: verification.discountTrack.eligible,
        onReservation: verification.taxExemptionTrack.onReservation,
        shippingAddress: {
          line1: '100 BIA Route 12',
          city: 'Window Rock',
          region: 'AZ',
          postalCode: '86515',
          country: 'US',
        },
        lines: [{ number: '1', quantity: 1, amount: 100, taxCode: 'P0000000', itemCode: 'SCRN-1', description: 'Screen' }],
      })

      const discountApplied = verification.discountTrack.eligible
      const taxExemptApplied = verification.taxExemptionTrack.taxExempt && avatax.isTaxExempt
      const entityUseCode = avatax.entityUseCode || null
      const customerTag = verification.customerTagApplied ? 'tribal-member-verified' : null

      const passed = !discountApplied && !taxExemptApplied && entityUseCode === null && customerTag === null

      return {
        scenario: 'NOT_ENROLLED_ON_RESERVATION',
        description: 'Customer shipping to reservation without verified tribal enrollment receives no discount and no tax exemption.',
        enrolled: false,
        onReservation: true,
        expectedDiscount: false,
        expectedDiscountPercent: 0,
        expectedTaxExempt: false,
        expectedEntityUseCode: null,
        expectedCustomerTag: null,
        actualResults: {
          discountApplied,
          discountPercent: verification.discountTrack.discountPercentage,
          taxExemptApplied,
          entityUseCode,
          customerTag,
          passed,
        },
      }
    }

    case 'NOT_ENROLLED_OFF_RESERVATION':
    default: {
      const verification = await verifyTribalEnrollment({
        customerId: 'cust_qa_4',
        firstName: 'Jane',
        lastName: 'Smith',
        tribalNation: 'None',
        tribalEnrollmentId: 'INVALID_999',
        shippingAddress: {
          address1: '123 Main St',
          city: 'Los Angeles',
          province: 'CA',
          zip: '90012',
        },
      })

      const avatax = await calculateAvaTaxTribalQuote({
        transactionCode: 'QA-TX-4',
        customerId: 'cust_qa_4',
        customerEmail: 'jane@example.com',
        isTribalMember: verification.discountTrack.eligible,
        onReservation: false,
        shippingAddress: {
          line1: '123 Main St',
          city: 'Los Angeles',
          region: 'CA',
          postalCode: '90012',
          country: 'US',
        },
        lines: [{ number: '1', quantity: 1, amount: 100, taxCode: 'P0000000', itemCode: 'SCRN-1', description: 'Screen' }],
      })

      const discountApplied = verification.discountTrack.eligible
      const taxExemptApplied = verification.taxExemptionTrack.taxExempt && avatax.isTaxExempt
      const entityUseCode = avatax.entityUseCode || null
      const customerTag = verification.customerTagApplied ? 'tribal-member-verified' : null

      const passed = !discountApplied && !taxExemptApplied && entityUseCode === null && customerTag === null

      return {
        scenario: 'NOT_ENROLLED_OFF_RESERVATION',
        description: 'Standard retail customer shipping off-reservation pays full price and standard destination sales tax.',
        enrolled: false,
        onReservation: false,
        expectedDiscount: false,
        expectedDiscountPercent: 0,
        expectedTaxExempt: false,
        expectedEntityUseCode: null,
        expectedCustomerTag: null,
        actualResults: {
          discountApplied,
          discountPercent: verification.discountTrack.discountPercentage,
          taxExemptApplied,
          entityUseCode,
          customerTag,
          passed,
        },
      }
    }
  }
}
