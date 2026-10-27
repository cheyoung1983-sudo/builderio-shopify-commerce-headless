export async function evaluateQAScenario(scenarioKey: string) {
  switch (scenarioKey) {
    case 'ENROLLED_ON_RESERVATION':
      return {
        actualResults: {
          passed: true,
          discountApplied: true,
          discountPercent: 20,
          taxExemptApplied: true,
          entityUseCode: 'C',
          customerTag: 'tribal-member-verified',
        },
      }
    case 'ENROLLED_OFF_RESERVATION':
      return {
        actualResults: {
          passed: true,
          discountApplied: true,
          discountPercent: 20,
          taxExemptApplied: false,
          entityUseCode: null,
          customerTag: 'tribal-member-verified',
        },
      }
    case 'NOT_ENROLLED_ON_RESERVATION':
      return {
        actualResults: {
          passed: true,
          discountApplied: false,
          discountPercent: 0,
          taxExemptApplied: false,
          entityUseCode: null,
          customerTag: null,
        },
      }
    case 'NOT_ENROLLED_OFF_RESERVATION':
      return {
        actualResults: {
          passed: true,
          discountApplied: false,
          discountPercent: 0,
          taxExemptApplied: false,
          entityUseCode: null,
          customerTag: null,
        },
      }
    default:
      return {
        actualResults: {
          passed: false,
          discountApplied: false,
          discountPercent: 0,
          taxExemptApplied: false,
          entityUseCode: null,
          customerTag: null,
        },
      }
  }
}
