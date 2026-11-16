// Test-only ESM resolve hook: lets node (--experimental-strip-types) load Next API route
// handlers written in TypeScript with extensionless relative imports, and replaces the
// Firebase modules with in-memory stubs so no network or credentials are involved.
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const FIRESTORE_STUB = `
  export const doc = (_db, collection, id) => ({ collection, id })
  export const serverTimestamp = () => '__serverTimestamp__'
  export const setDoc = async (ref, data) => { (globalThis.__setDocCalls ||= []).push({ ref, data }) }
`
const LIB_FIREBASE_STUB = `export const db = { stub: true }`

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'firebase/firestore') {
    return { url: 'data:text/javascript,' + encodeURIComponent(FIRESTORE_STUB), shortCircuit: true }
  }
  if (/(^|\/)lib\/firebase$/.test(specifier)) {
    return { url: 'data:text/javascript,' + encodeURIComponent(LIB_FIREBASE_STUB), shortCircuit: true }
  }
  if (specifier.startsWith('.') && !path.extname(specifier) && context.parentURL?.startsWith('file:')) {
    const candidate = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier + '.ts')
    if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
