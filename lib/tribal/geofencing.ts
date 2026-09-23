import type { GeofenceResult, TribalNation } from './types.ts'

export const KNOWN_TRIBAL_NATIONS: TribalNation[] = [
  {
    id: 'navajo-nation',
    name: 'Navajo Nation',
    state: 'AZ',
    isFederallyRecognized: true,
    isSelfAdministered: true,
    tribalTaxRate: 0.06, // 6% Navajo Nation Sales Tax
    aianaCode: '2430',
    reservationName: 'Navajo Nation Reservation and Off-Reservation Trust Land',
    zipCodes: ['86045', '86047', '86053', '86054', '86502', '86503', '86504', '86505', '86507', '86508', '86510', '86511', '86512', '86514', '86515', '86520', '86535', '86538', '86540', '86544', '86545', '86547', '86549', '86556', '87328'],
  },
  {
    id: 'gila-river',
    name: 'Gila River Indian Community',
    state: 'AZ',
    isFederallyRecognized: true,
    isSelfAdministered: true,
    tribalTaxRate: 0.04, // 4% Gila River Sales Tax
    aianaCode: '1270',
    reservationName: 'Gila River Indian Reservation',
    zipCodes: ['85147', '85221', '85247', '85339'],
  },
  {
    id: 'salt-river',
    name: 'Salt River Pima-Maricopa Indian Community',
    state: 'AZ',
    isFederallyRecognized: true,
    isSelfAdministered: true,
    tribalTaxRate: 0.02,
    aianaCode: '3510',
    reservationName: 'Salt River Reservation',
    zipCodes: ['85256'],
  },
  {
    id: 'tohono-oodham',
    name: "Tohono O'odham Nation",
    state: 'AZ',
    isFederallyRecognized: true,
    isSelfAdministered: true,
    tribalTaxRate: 0.05,
    aianaCode: '4220',
    reservationName: "Tohono O'odham Nation Reservation",
    zipCodes: ['85634', '85639', '85633'],
  },
  {
    id: 'hopi-tribe',
    name: 'Hopi Tribe of Arizona',
    state: 'AZ',
    isFederallyRecognized: true,
    isSelfAdministered: false,
    aianaCode: '1540',
    reservationName: 'Hopi Reservation',
    zipCodes: ['86034', '86039', '86042', '86043'],
  },
  {
    id: 'yakama-nation',
    name: 'Confederated Tribes and Bands of the Yakama Nation',
    state: 'WA',
    isFederallyRecognized: true,
    isSelfAdministered: false,
    aianaCode: '4790',
    reservationName: 'Yakama Nation Reservation',
    zipCodes: ['98948', '98952', '98953', '98951', '98930'],
  },
  {
    id: 'puyallup-tribe',
    name: 'Puyallup Tribe of the Puyallup Reservation',
    state: 'WA',
    isFederallyRecognized: true,
    isSelfAdministered: false,
    aianaCode: '3040',
    reservationName: 'Puyallup Reservation',
    zipCodes: ['98404', '98421', '98424'],
  },
  {
    id: 'tulalip-tribes',
    name: 'Tulalip Tribes of Washington',
    state: 'WA',
    isFederallyRecognized: true,
    isSelfAdministered: true,
    tribalTaxRate: 0.03,
    aianaCode: '4280',
    reservationName: 'Tulalip Reservation',
    zipCodes: ['98271'],
  },
  {
    id: 'morongo-band',
    name: 'Morongo Band of Mission Indians',
    state: 'CA',
    isFederallyRecognized: true,
    isSelfAdministered: false,
    aianaCode: '2350',
    reservationName: 'Morongo Reservation',
    zipCodes: ['92220'],
  },
  {
    id: 'agua-caliente',
    name: 'Agua Caliente Band of Cahuilla Indians',
    state: 'CA',
    isFederallyRecognized: true,
    isSelfAdministered: false,
    aianaCode: '0060',
    reservationName: 'Agua Caliente Indian Reservation',
    zipCodes: ['92262', '92264', '92234'],
  },
  {
    id: 'hoopa-valley',
    name: 'Hoopa Valley Tribe',
    state: 'CA',
    isFederallyRecognized: true,
    isSelfAdministered: false,
    aianaCode: '1530',
    reservationName: 'Hoopa Valley Reservation',
    zipCodes: ['95546'],
  },
  {
    id: 'cherokee-nation',
    name: 'Cherokee Nation',
    state: 'OK',
    isFederallyRecognized: true,
    isSelfAdministered: false,
    aianaCode: '0710',
    reservationName: 'Cherokee Nation Tribal Reservation Area',
    zipCodes: ['74464', '74465', '74960', '74344'],
  },
  {
    id: 'pine-ridge',
    name: 'Oglala Sioux Tribe (Pine Ridge)',
    state: 'SD',
    isFederallyRecognized: true,
    isSelfAdministered: false,
    aianaCode: '2810',
    reservationName: 'Pine Ridge Reservation',
    zipCodes: ['57770', '57772', '57756'],
  },
  {
    id: 'blackfeet-tribe',
    name: 'Blackfeet Tribe of the Blackfeet Indian Reservation',
    state: 'MT',
    isFederallyRecognized: true,
    isSelfAdministered: false,
    aianaCode: '0350',
    reservationName: 'Blackfeet Indian Reservation',
    zipCodes: ['59417', '59411', '59484'],
  },
]

export function evaluateAddressGeofence(address: {
  address1?: string
  city?: string
  province?: string
  state?: string
  zip?: string
  postalCode?: string
  country?: string
}): GeofenceResult {
  const street = (address.address1 || '').trim()
  const city = (address.city || '').trim()
  const state = (address.province || address.state || 'US').trim().toUpperCase()
  const rawZip = (address.zip || address.postalCode || '').trim()
  const cleanZip = rawZip.split('-')[0].padStart(5, '0')

  const matchedNation = KNOWN_TRIBAL_NATIONS.find((nation) =>
    nation.zipCodes?.includes(cleanZip)
  )

  if (matchedNation) {
    return {
      onReservation: true,
      reservationName: matchedNation.reservationName,
      aianaCode: matchedNation.aianaCode,
      tribalNation: matchedNation.name,
      isSelfAdministered: matchedNation.isSelfAdministered,
      tribalTaxRate: matchedNation.tribalTaxRate,
      stateJurisdiction: matchedNation.state,
      normalizedAddress: {
        street,
        city,
        state,
        zip: cleanZip,
      },
      message: matchedNation.isSelfAdministered
        ? `Delivery address is on ${matchedNation.reservationName} (Self-administered tribal tax jurisdiction: ${(matchedNation.tribalTaxRate! * 100).toFixed(1)}%). State sales tax exempt.`
        : `Delivery address is within the ${matchedNation.reservationName} (AIANA: ${matchedNation.aianaCode}). Statutory state and local sales tax exemption applies.`,
    }
  }

  const lowerStreet = street.toLowerCase()
  const lowerCity = city.toLowerCase()
  const isReservationKeyword =
    lowerStreet.includes('reservation') ||
    lowerStreet.includes('tribal road') ||
    lowerStreet.includes('bureau of indian affairs') ||
    lowerStreet.includes('bia route') ||
    lowerStreet.includes('chapter house') ||
    lowerCity.includes('window rock') ||
    lowerCity.includes('tuba city') ||
    lowerCity.includes('chinle') ||
    lowerCity.includes('fort defiance') ||
    lowerCity.includes('sacaton') ||
    lowerCity.includes('toppenish')

  if (isReservationKeyword) {
    return {
      onReservation: true,
      reservationName: 'Identified Tribal Reservation Land Area',
      aianaCode: 'AIANA-AUTO',
      tribalNation: 'Federally Recognized Indian Tribe',
      isSelfAdministered: false,
      stateJurisdiction: state,
      normalizedAddress: { street, city, state, zip: cleanZip },
      message: 'Delivery address is on federal trust/tribal reservation land. Statutory sales tax exemption applies.',
    }
  }

  return {
    onReservation: false,
    stateJurisdiction: state,
    isSelfAdministered: false,
    normalizedAddress: { street, city, state, zip: cleanZip },
    message: 'Delivery address is outside recognized Indian Reservation / AIANA boundary. Commercial 20% discount remains active for verified members, but statutory on-reservation sales tax exemption is not applicable.',
  }
}
