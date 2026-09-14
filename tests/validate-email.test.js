const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function runValidation(input) {
  const repoRoot = path.resolve(__dirname, '..')
  const utilUrl = pathToFileURL(path.join(repoRoot, 'lib/validate-email.ts')).href

  const script = `
    const { validateEmail } = await import(${JSON.stringify(utilUrl)})
    const result = validateEmail(${JSON.stringify(input)})
    console.log(JSON.stringify(result))
  `

  const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  })

  return JSON.parse(output.trim())
}

describe('email validation utility', () => {
  test('returns error for empty input', () => {
    const res = runValidation('')
    expect(res.isValid).toBe(false)
    expect(res.error).toBe('Please enter your email address.')

    const resWhitespace = runValidation('   ')
    expect(resWhitespace.isValid).toBe(false)
    expect(resWhitespace.error).toBe('Please enter your email address.')
  })

  test('returns error for spaces inside email', () => {
    const res = runValidation('user name@example.com')
    expect(res.isValid).toBe(false)
    expect(res.error).toBe('Email address cannot contain spaces.')
  })

  test('returns error when missing @ symbol', () => {
    const res = runValidation('userexample.com')
    expect(res.isValid).toBe(false)
    expect(res.error).toMatch(/Please include an '@' in your email address/)
  })

  test('returns error for multiple @ symbols', () => {
    const res = runValidation('user@@example.com')
    expect(res.isValid).toBe(false)
    expect(res.error).toMatch(/can only contain a single '@' symbol/)
  })

  test('returns error for missing username before @', () => {
    const res = runValidation('@example.com')
    expect(res.isValid).toBe(false)
    expect(res.error).toMatch(/Please enter a username before the '@' sign/)
  })

  test('returns error for missing domain after @', () => {
    const res = runValidation('user@')
    expect(res.isValid).toBe(false)
    expect(res.error).toMatch(/Please enter a domain name after '@'/)
  })

  test('returns error for missing top-level domain extension', () => {
    const res = runValidation('user@example')
    expect(res.isValid).toBe(false)
    expect(res.error).toMatch(/Email domain is missing an extension/)
  })

  test('returns error for short top-level domain extension', () => {
    const res = runValidation('user@example.c')
    expect(res.isValid).toBe(false)
    expect(res.error).toMatch(/extension must be at least 2 characters/)
  })

  test('suggests correction for common domain typos', () => {
    const res = runValidation('tech@gmai.com')
    expect(res.isValid).toBe(false)
    expect(res.error).toContain('Did you mean @gmail.com?')
    expect(res.suggestion).toBe('tech@gmail.com')
  })

  test('accepts valid email addresses', () => {
    const validEmails = [
      'technician@displaycellpros.com',
      'repair.specialist@shop.co.uk',
      'diy+tips@mail.google.com',
      'contact_pro@domain.org',
    ]

    for (const email of validEmails) {
      const res = runValidation(email)
      expect(res.isValid).toBe(true)
      expect(res.error).toBeNull()
      expect(res.sanitizedEmail).toBe(email.toLowerCase())
    }
  })
})

