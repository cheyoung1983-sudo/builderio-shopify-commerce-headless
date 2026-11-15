/**
 * Regression: Repair AI launcher click was a no-op on production because the
 * next/dynamic loading fallback rendered <VoiceLauncherStub /> without handlers.
 */
const fs = require('fs')
const path = require('path')
const src = fs.readFileSync(
  path.join(__dirname, '..', 'components/voice/FloatingVoiceAgentWrapper.tsx'),
  'utf8'
)

describe('FloatingVoiceAgentWrapper launcher', () => {
  test('never renders a handler-less stub', () => {
    expect(src).not.toMatch(/<VoiceLauncherStub\s*\/>/)
    expect(src).not.toMatch(/loading:\s*\(\)\s*=>\s*<VoiceLauncherStub/)
  })
  test('does not use next/dynamic for the agent swap', () => {
    expect(src).not.toMatch(/from 'next\/dynamic'/)
  })
  test('stub is always wired and has loading/error states', () => {
    expect(src).toMatch(/<VoiceLauncherStub state=\{stubState\} onIntent=\{onIntent\} onActivate=\{onActivate\}/)
    expect(src).toMatch(/'Connecting'/)
    expect(src).toMatch(/setStubState\('error'\)/)
    expect(src).toMatch(/agentPromise = null/)
  })
  test('renders the resolved agent opened', () => {
    expect(src).toMatch(/<Agent initialOpen \/>/)
  })
  test('keeps pointer-events pattern and cart hide', () => {
    expect(src).toMatch(/pointer-events-none/)
    expect(src).toMatch(/pointer-events-auto/)
    expect(src).toMatch(/hidden=\{cartDrawerOpen\}/)
  })
})
