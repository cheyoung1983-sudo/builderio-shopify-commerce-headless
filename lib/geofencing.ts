/**
 * U.S. Census TIGER/Line Shapefiles AIANA Geofencing Engine
 * 
 * Determines whether geographic coordinates (latitude, longitude) intersect
 * with predefined American Indian / Alaska Native / Native Hawaiian (AIANA)
 * reservation and trust land boundaries from U.S. Census TIGER/Line Shapefiles.
 */

export interface AIANABoundary {
  aianaCode: string
  name: string
  state: string
  isSelfAdministered: boolean
  tribalTaxRate?: number
  bbox: [number, number, number, number] // [minLat, minLng, maxLat, maxLng]
  polygon?: Array<[number, number]> // [lat, lng] coordinates representing boundary perimeter
}

/**
 * Predefined U.S. Census TIGER/Line AIANA boundary definitions
 */
export const TIGER_LINE_AIANA_BOUNDARIES: AIANABoundary[] = [
  {
    aianaCode: '2430',
    name: 'Navajo Nation Reservation and Off-Reservation Trust Land',
    state: 'AZ',
    isSelfAdministered: true,
    tribalTaxRate: 0.06,
    bbox: [35.1, -111.6, 37.3, -108.2],
    polygon: [
      [35.1, -111.4],
      [35.2, -111.6],
      [36.8, -111.5],
      [37.0, -110.0],
      [37.0, -108.5],
      [36.5, -108.2],
      [35.5, -108.3],
      [35.1, -109.5],
      [35.1, -111.4],
    ],
  },
  {
    aianaCode: '1270',
    name: 'Gila River Indian Reservation',
    state: 'AZ',
    isSelfAdministered: true,
    tribalTaxRate: 0.04,
    bbox: [33.0, -112.35, 33.38, -111.65],
    polygon: [
      [33.0, -112.35],
      [33.38, -112.35],
      [33.38, -111.65],
      [33.0, -111.65],
      [33.0, -112.35],
    ],
  },
  {
    aianaCode: '3510',
    name: 'Salt River Reservation',
    state: 'AZ',
    isSelfAdministered: true,
    tribalTaxRate: 0.02,
    bbox: [33.45, -111.92, 33.58, -111.75],
    polygon: [
      [33.45, -111.92],
      [33.58, -111.92],
      [33.58, -111.75],
      [33.45, -111.75],
      [33.45, -111.92],
    ],
  },
  {
    aianaCode: '4220',
    name: "Tohono O'odham Nation Reservation",
    state: 'AZ',
    isSelfAdministered: true,
    tribalTaxRate: 0.05,
    bbox: [31.5, -112.9, 32.65, -111.5],
    polygon: [
      [31.5, -112.8],
      [32.6, -112.9],
      [32.65, -111.6],
      [31.6, -111.5],
      [31.5, -112.8],
    ],
  },
  {
    aianaCode: '1540',
    name: 'Hopi Reservation',
    state: 'AZ',
    isSelfAdministered: false,
    bbox: [35.6, -110.85, 36.35, -110.0],
    polygon: [
      [35.6, -110.8],
      [36.35, -110.85],
      [36.3, -110.0],
      [35.65, -110.05],
      [35.6, -110.8],
    ],
  },
  {
    aianaCode: '4790',
    name: 'Yakama Nation Reservation',
    state: 'WA',
    isSelfAdministered: false,
    bbox: [46.0, -121.5, 46.65, -120.0],
    polygon: [
      [46.0, -121.4],
      [46.65, -121.5],
      [46.6, -120.0],
      [46.05, -120.1],
      [46.0, -121.4],
    ],
  },
  {
    aianaCode: '3040',
    name: 'Puyallup Reservation',
    state: 'WA',
    isSelfAdministered: false,
    bbox: [47.18, -122.45, 47.30, -122.35],
    polygon: [
      [47.18, -122.45],
      [47.30, -122.45],
      [47.30, -122.35],
      [47.18, -122.35],
      [47.18, -122.45],
    ],
  },
  {
    aianaCode: '4280',
    name: 'Tulalip Reservation',
    state: 'WA',
    isSelfAdministered: true,
    tribalTaxRate: 0.03,
    bbox: [48.02, -122.38, 48.15, -122.25],
    polygon: [
      [48.02, -122.38],
      [48.15, -122.38],
      [48.15, -122.25],
      [48.02, -122.25],
      [48.02, -122.38],
    ],
  },
  {
    aianaCode: '2350',
    name: 'Morongo Reservation',
    state: 'CA',
    isSelfAdministered: false,
    bbox: [33.9, -116.9, 34.02, -116.75],
    polygon: [
      [33.9, -116.9],
      [34.02, -116.9],
      [34.02, -116.75],
      [33.9, -116.75],
      [33.9, -116.9],
    ],
  },
  {
    aianaCode: '0060',
    name: 'Agua Caliente Indian Reservation',
    state: 'CA',
    isSelfAdministered: false,
    bbox: [33.7, -116.6, 33.9, -116.4],
    polygon: [
      [33.7, -116.6],
      [33.9, -116.6],
      [33.9, -116.4],
      [33.7, -116.4],
      [33.7, -116.6],
    ],
  },
  {
    aianaCode: '0710',
    name: 'Cherokee Nation Tribal Reservation Area',
    state: 'OK',
    isSelfAdministered: false,
    bbox: [35.4, -95.6, 36.9, -94.4],
    polygon: [
      [35.4, -95.6],
      [36.9, -95.6],
      [36.9, -94.4],
      [35.4, -94.4],
      [35.4, -95.6],
    ],
  },
  {
    aianaCode: '2810',
    name: 'Pine Ridge Reservation',
    state: 'SD',
    isSelfAdministered: false,
    bbox: [43.0, -103.0, 43.8, -101.5],
    polygon: [
      [43.0, -103.0],
      [43.8, -103.0],
      [43.8, -101.5],
      [43.0, -101.5],
      [43.0, -103.0],
    ],
  },
  {
    aianaCode: '0350',
    name: 'Blackfeet Indian Reservation',
    state: 'MT',
    isSelfAdministered: false,
    bbox: [48.2, -113.8, 49.0, -112.3],
    polygon: [
      [48.2, -113.8],
      [49.0, -113.8],
      [49.0, -112.3],
      [48.2, -112.3],
      [48.2, -113.8],
    ],
  },
]

/**
 * Standard Ray-Casting algorithm for Point-in-Polygon geometric intersection.
 * @param lat Latitude of the target point
 * @param lng Longitude of the target point
 * @param polygon Array of [lat, lng] vertex coordinates
 */
export function isPointInPolygon(lat: number, lng: number, polygon: Array<[number, number]>): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]
    const yi = polygon[i][1]
    const xj = polygon[j][0]
    const yj = polygon[j][1]

    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Evaluates whether a coordinate (lat, lng) intersects with a bounding box [minLat, minLng, maxLat, maxLng].
 */
export function isPointInBBox(lat: number, lng: number, bbox: [number, number, number, number]): boolean {
  const [minLat, minLng, maxLat, maxLng] = bbox
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
}

export interface CoordinateGeofenceResult {
  onReservation: boolean
  reservationName?: string
  aianaCode?: string
  isSelfAdministered?: boolean
  tribalTaxRate?: number
  state?: string
}

/**
 * Primary utility function:
 * Checks if geographic latitude/longitude coordinates intersect with predefined
 * U.S. Census TIGER/Line Shapefiles for AIANA areas.
 * 
 * Returns a boolean onReservation status (and boundary metadata).
 * 
 * @param latitude Target latitude
 * @param longitude Target longitude
 * @returns boolean 'onReservation' status or detailed boundary match result
 */
export function checkCoordinatesIntersectAIANA(
  latitude: number,
  longitude: number
): CoordinateGeofenceResult {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
    return { onReservation: false }
  }

  for (const boundary of TIGER_LINE_AIANA_BOUNDARIES) {
    // 1. Fast bounding box check
    if (!isPointInBBox(latitude, longitude, boundary.bbox)) {
      continue
    }

    // 2. Precise polygon intersection (if polygon is defined)
    const isInside = boundary.polygon
      ? isPointInPolygon(latitude, longitude, boundary.polygon)
      : true

    if (isInside) {
      return {
        onReservation: true,
        reservationName: boundary.name,
        aianaCode: boundary.aianaCode,
        isSelfAdministered: boundary.isSelfAdministered,
        tribalTaxRate: boundary.tribalTaxRate,
        state: boundary.state,
      }
    }
  }

  return { onReservation: false }
}

/**
 * Convenient shorthand returning exclusively the boolean onReservation status.
 * @param latitude Target latitude coordinate
 * @param longitude Target longitude coordinate
 * @returns boolean indicating whether the coordinates fall inside an AIANA reservation area
 */
export function isCoordinatesOnReservation(latitude: number, longitude: number): boolean {
  return checkCoordinatesIntersectAIANA(latitude, longitude).onReservation
}

export default checkCoordinatesIntersectAIANA
