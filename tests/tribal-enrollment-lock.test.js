const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function runEnrollmentHelpers() {
  const moduleUrl = pathToFileURL(
    path.resolve(__dirname, '../lib/tribal/enrollment-lock.ts')
  ).href
  const script = `
    const helpers = await import(${JSON.stringify(moduleUrl)})
    console.log(JSON.stringify({
      normalized: helpers.normalizeEnrollmentId('  nn-12345  '),
      hash: helpers.generateEnrollmentHash('Navajo Nation', 'NN-12345'),
      masked: helpers.maskEnrollmentId('NN-12345'),
      valid: helpers.validateEnrollmentNumberFormat('NN-12345'),
      placeholder: helpers.validateEnrollmentNumberFormat('1234'),
      claimHelper: typeof helpers.checkAndClaimTribalEnrollment
    }))
  `
  const output = execFileSync(
    process.execPath,
    ['--experimental-strip-types', '--input-type=module', '-e', script],
    { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }
  )

  return JSON.parse(output.trim())
}

describe('tribal enrollment ID helpers', () => {
  test('normalizes and masks the enrollment ID without exposing its full value', () => {
    const result = runEnrollmentHelpers()

    expect(result.normalized).toBe('NN12345')
    expect(result.masked).toBe('••••2345')
  })

  test('hashes the nation and normalized enrollment ID deterministically', () => {
    const result = runEnrollmentHelpers()

    expect(result.hash).toBe('7bc4d4470dffaa1bfadf8d387f3e3a87beeaf0b5ac786ef47c35716619ef14c5')
  })

  test('validates enrollment format without claiming or granting a discount', () => {
    const result = runEnrollmentHelpers()

    expect(result.valid).toEqual({ valid: true })
    expect(result.placeholder.valid).toBe(false)
    expect(result.claimHelper).toBe('undefined')
  })
})
