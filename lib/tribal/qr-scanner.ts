/**
 * Tribal ID Card QR Code Scanner & Enrollment Data Parser
 * 
 * Supports reading 2D barcodes, QR codes, and digital tribal credentials
 * issued by federally recognized tribes (e.g. BIA Enhanced Tribal Cards,
 * Navajo Nation CIB, Cherokee Nation Citizen ID, Yakama Nation Enrollment).
 */

export interface ScannedTribalIdData {
  firstName: string
  lastName: string
  fullName: string
  tribalNation: string
  enrollmentId: string
  birthDate?: string
  address1?: string
  city?: string
  state?: string
  zip?: string
  reservationName?: string
  cardType?: string
  rawScanData: string
  scannedAt: string
}

export interface TribalIdCardPreset {
  id: string
  label: string
  description: string
  data: ScannedTribalIdData
}

/**
 * Pre-configured realistic sample tribal cards for testing & audits
 */
export const SAMPLE_TRIBAL_ID_PRESETS: TribalIdCardPreset[] = [
  {
    id: 'navajo-sample',
    label: 'Navajo Nation - Enrolled Member',
    description: 'Window Rock, AZ - Certificate of Indian Blood (CIB)',
    data: {
      firstName: 'Che',
      lastName: 'Young',
      fullName: 'Che Young',
      tribalNation: 'Navajo Nation',
      enrollmentId: 'NAV-98442',
      birthDate: '1983-05-12',
      address1: '100 Highway 264, BIA Route 12',
      city: 'Window Rock',
      state: 'AZ',
      zip: '86515',
      reservationName: 'Navajo Nation Reservation',
      cardType: 'Navajo Nation Official CIB / Digital Credential',
      rawScanData: JSON.stringify({
        type: 'TRIBAL_ID',
        v: 2,
        nation: 'Navajo Nation',
        id: 'NAV-98442',
        first: 'Che',
        last: 'Young',
        dob: '1983-05-12',
        addr: '100 Highway 264, BIA Route 12',
        city: 'Window Rock',
        state: 'AZ',
        zip: '86515',
        res: 'Navajo Nation Reservation',
      }),
      scannedAt: new Date().toISOString(),
    },
  },
  {
    id: 'yakama-sample',
    label: 'Yakama Nation - Tribal Member',
    description: 'Toppenish, WA - Washington WAC 458-20-192 Qualified',
    data: {
      firstName: 'David',
      lastName: 'Yakima',
      fullName: 'David Yakima',
      tribalNation: 'Confederated Tribes and Bands of the Yakama Nation',
      enrollmentId: 'YAK-44120',
      birthDate: '1979-11-20',
      address1: '401 Fort Road',
      city: 'Toppenish',
      state: 'WA',
      zip: '98948',
      reservationName: 'Yakama Indian Reservation',
      cardType: 'Yakama Nation Tribal Enrollment Card',
      rawScanData: JSON.stringify({
        type: 'TRIBAL_ID',
        v: 2,
        nation: 'Confederated Tribes and Bands of the Yakama Nation',
        id: 'YAK-44120',
        first: 'David',
        last: 'Yakima',
        dob: '1979-11-20',
        addr: '401 Fort Road',
        city: 'Toppenish',
        state: 'WA',
        zip: '98948',
        res: 'Yakama Indian Reservation',
      }),
      scannedAt: new Date().toISOString(),
    },
  },
  {
    id: 'hoopa-sample',
    label: 'Hoopa Valley Tribe - California Member',
    description: 'Hoopa, CA - CDTFA-146-RES Qualified Trust Land',
    data: {
      firstName: 'Elena',
      lastName: 'Colegrove',
      fullName: 'Elena Colegrove',
      tribalNation: 'Hoopa Valley Tribe',
      enrollmentId: 'HVP-33019',
      birthDate: '1991-03-08',
      address1: '11880 State Highway 96',
      city: 'Hoopa',
      state: 'CA',
      zip: '95546',
      reservationName: 'Hoopa Valley Reservation',
      cardType: 'Hoopa Valley Tribal Identification Card',
      rawScanData: JSON.stringify({
        type: 'TRIBAL_ID',
        v: 2,
        nation: 'Hoopa Valley Tribe',
        id: 'HVP-33019',
        first: 'Elena',
        last: 'Colegrove',
        dob: '1991-03-08',
        addr: '11880 State Highway 96',
        city: 'Hoopa',
        state: 'CA',
        zip: '95546',
        res: 'Hoopa Valley Reservation',
      }),
      scannedAt: new Date().toISOString(),
    },
  },
  {
    id: 'cherokee-sample',
    label: 'Cherokee Nation - Citizen ID',
    description: 'Tahlequah, OK - Cherokee Reservation Jurisdictional Area',
    data: {
      firstName: 'Sarah',
      lastName: 'Ross',
      fullName: 'Sarah Ross',
      tribalNation: 'Cherokee Nation',
      enrollmentId: 'CN-872104',
      birthDate: '1986-07-24',
      address1: '17675 S. Muskogee Ave',
      city: 'Tahlequah',
      state: 'OK',
      zip: '74464',
      reservationName: 'Cherokee Nation Reservation',
      cardType: 'Cherokee Nation Tribal Citizenship Card',
      rawScanData: JSON.stringify({
        type: 'TRIBAL_ID',
        v: 2,
        nation: 'Cherokee Nation',
        id: 'CN-872104',
        first: 'Sarah',
        last: 'Ross',
        dob: '1986-07-24',
        addr: '17675 S. Muskogee Ave',
        city: 'Tahlequah',
        state: 'OK',
        zip: '74464',
        res: 'Cherokee Nation Reservation',
      }),
      scannedAt: new Date().toISOString(),
    },
  },
]

/**
 * Parses raw barcode / QR code string into structured Tribal ID data
 */
export function parseTribalQrPayload(raw: string): ScannedTribalIdData | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  // 1. Try parsing JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed)
      const firstName =
        obj.firstName || obj.first || obj.givenName || obj.fname || ''
      const lastName =
        obj.lastName || obj.last || obj.familyName || obj.lname || ''
      const fullName =
        obj.fullName ||
        obj.name ||
        [firstName, lastName].filter(Boolean).join(' ') ||
        'Verified Enrolled Member'

      const tribalNation =
        obj.tribalNation ||
        obj.nation ||
        obj.tribe ||
        obj.tribalAffiliation ||
        'Federally Recognized Tribal Nation'

      const enrollmentId =
        obj.enrollmentId ||
        obj.id ||
        obj.censusId ||
        obj.rollNumber ||
        obj.memberId ||
        ''

      if (enrollmentId || tribalNation) {
        return {
          firstName,
          lastName,
          fullName,
          tribalNation,
          enrollmentId: enrollmentId || 'TRIBAL-ENROLLED',
          birthDate: obj.birthDate || obj.dob || obj.dateOfBirth || '',
          address1: obj.address1 || obj.addr || obj.address || '',
          city: obj.city || '',
          state: (obj.state || obj.province || 'AZ').toUpperCase(),
          zip: obj.zip || obj.postalCode || '',
          reservationName: obj.reservationName || obj.res || tribalNation,
          cardType: obj.cardType || obj.type || 'Enhanced Tribal Card (QR Verified)',
          rawScanData: trimmed,
          scannedAt: new Date().toISOString(),
        }
      }
    } catch {
      // Not JSON, continue to other formats
    }
  }

  // 2. Try pipe or semicolon-separated barcode string:
  // e.g. TRIBAL_ID|Navajo Nation|NAV-98442|Che|Young|1983-05-12|Window Rock|AZ|86515
  if (trimmed.includes('|') || trimmed.includes(';')) {
    const delimiter = trimmed.includes('|') ? '|' : ';'
    const parts = trimmed.split(delimiter).map((p) => p.trim())

    if (parts.length >= 3) {
      let startIndex = 0
      if (parts[0].toUpperCase().includes('TRIBAL') || parts[0].toUpperCase().includes('ID')) {
        startIndex = 1
      }

      const tribalNation = parts[startIndex] || 'Federally Recognized Tribal Nation'
      const enrollmentId = parts[startIndex + 1] || ''
      const firstName = parts[startIndex + 2] || ''
      const lastName = parts[startIndex + 3] || ''
      const birthDate = parts[startIndex + 4] || ''
      const city = parts[startIndex + 5] || ''
      const state = (parts[startIndex + 6] || 'AZ').toUpperCase()
      const zip = parts[startIndex + 7] || ''

      return {
        firstName,
        lastName,
        fullName: [firstName, lastName].filter(Boolean).join(' ') || 'Verified Member',
        tribalNation,
        enrollmentId: enrollmentId || 'VERIFIED-MEMBER',
        birthDate,
        city,
        state,
        zip,
        rawScanData: trimmed,
        scannedAt: new Date().toISOString(),
      }
    }
  }

  // 3. Try key-value line blocks:
  // NATION: Navajo Nation
  // ID: NAV-98442
  // NAME: Che Young
  if (trimmed.includes(':')) {
    const lines = trimmed.split('\n').map((l) => l.trim())
    const map: Record<string, string> = {}
    for (const line of lines) {
      const idx = line.indexOf(':')
      if (idx > 0) {
        const k = line.substring(0, idx).trim().toLowerCase()
        const v = line.substring(idx + 1).trim()
        map[k] = v
      }
    }

    const nation = map['nation'] || map['tribe'] || map['tribal nation'] || ''
    const id = map['id'] || map['enrollment'] || map['census id'] || map['roll'] || ''
    const name = map['name'] || map['full name'] || ''

    if (nation || id || name) {
      const nameParts = name.split(' ')
      return {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        fullName: name || 'Verified Member',
        tribalNation: nation || 'Federally Recognized Tribal Nation',
        enrollmentId: id || 'TRIBAL-ID-SCANNED',
        birthDate: map['dob'] || map['birthdate'] || '',
        city: map['city'] || '',
        state: (map['state'] || 'AZ').toUpperCase(),
        zip: map['zip'] || '',
        rawScanData: trimmed,
        scannedAt: new Date().toISOString(),
      }
    }
  }

  // Fallback: If it's a simple enrollment token or text
  if (trimmed.length >= 4) {
    return {
      firstName: '',
      lastName: '',
      fullName: 'Enrolled Member',
      tribalNation: 'Federally Recognized Tribal Nation',
      enrollmentId: trimmed,
      rawScanData: trimmed,
      scannedAt: new Date().toISOString(),
    }
  }

  return null
}
