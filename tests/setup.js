/**
 * Jest Setup File
 * Provides essential globals that are missing in the jsdom environment
 * but required by certain Node.js libraries (e.g., @noble/hashes, cuid2, postgres).
 */

const { TextEncoder, TextDecoder } = require('node:util')

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder
}

if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn) => setTimeout(fn, 0)
}

if (typeof global.clearImmediate === 'undefined') {
  global.clearImmediate = () => {}
}

// Provide a fallback DATABASE_URL to prevent lib/db from throwing during test boot.
// Integration tests that require a real DB will still fail on connection, but
// the suite won't crash during the import phase.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://localhost:5432/test_db'
}
