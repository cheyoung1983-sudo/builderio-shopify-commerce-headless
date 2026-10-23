/**
 * Utility functions and specifications for bridging device compatibility selections
 * to Mail-In Repair intake workflows.
 */

export interface PrepaidShippingSpecification {
  maxDeviceWeightGrams: number
  maxDeviceWeightOz: number
  maxPackageWeightLbs: number
  maxPackageWeightOz: number
  postageType: 'PREPAID_POSTAGE_INCLUDED'
  carrierCompliance: string
  boxDimensions: string
  cushioningMaterial: string
}

export const PREPAID_SHIPPING_SPECS: PrepaidShippingSpecification = {
  maxDeviceWeightGrams: 260, // Accommodates heaviest smartphones e.g. Galaxy Z Fold (253g)
  maxDeviceWeightOz: 9.2,
  maxPackageWeightLbs: 2.0, // Certified prepaid postal tier
  maxPackageWeightOz: 32.0,
  postageType: 'PREPAID_POSTAGE_INCLUDED',
  carrierCompliance: 'DOT 49 CFR § 173.185 & UN3481 Lithium-ion battery ground transport certified',
  boxDimensions: '7" x 5" x 3" Heavy-Duty 200# Mullen Test Corrugated Mailer',
  cushioningMaterial: 'High-density anti-static conductive foam insert',
}

/**
 * Maps a catalog part category ID to the corresponding diagnostic symptom ID
 * used by the Mail-In Repair intake system.
 */
export function mapCategoryToSymptom(categoryId?: string | null): string {
  switch (categoryId) {
    case 'screen':
      return 'screen_cracked'
    case 'battery':
      return 'battery_degraded'
    case 'port':
      return 'port_audio'
    case 'camera':
      return 'camera_sensors'
    case 'backglass':
      return 'screen_cracked'
    case 'tools':
    case 'all':
    default:
      return 'screen_cracked'
  }
}

/**
 * Human-readable label for a diagnostic symptom ID
 */
export function getSymptomLabel(symptomId: string): string {
  switch (symptomId) {
    case 'screen_cracked':
      return 'Screen Replacement & OLED Assembly'
    case 'battery_degraded':
      return 'Battery Health Replacement & Recalibration'
    case 'port_audio':
      return 'Charging Port & Flex Cable Service'
    case 'camera_sensors':
      return 'Camera Module & Optical Sensor Repair'
    case 'water_damage':
      return 'Ultrasonic Liquid Damage Restoration'
    case 'logic_board_micro':
      return 'Micro-Soldering & Logic Board Service'
    default:
      return 'Certified Hardware Installation Service'
  }
}

/**
 * Builds the URL with query parameters to open the Mail-In Repair form pre-filled
 */
export function buildRepairServiceUrl(params: {
  brand?: string | null
  model?: string | null
  categoryId?: string | null
  symptom?: string | null
}): string {
  const searchParams = new URLSearchParams()
  if (params.brand) searchParams.set('brand', params.brand)
  if (params.model) searchParams.set('model', params.model)

  const symptom = params.symptom || mapCategoryToSymptom(params.categoryId)
  if (symptom) searchParams.set('symptom', symptom)

  if (params.categoryId) searchParams.set('category', params.categoryId)

  return `/services?${searchParams.toString()}`
}
