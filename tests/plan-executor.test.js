const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function runAgentMethod(codeSnippet) {
  const repoRoot = path.resolve(__dirname, '..')
  const utilUrl = pathToFileURL(path.join(repoRoot, 'lib/agent/planExecutor.ts')).href

  const script = `
    const { SUPERPOWERS_AGENT_SYSTEM_PROMPT, parsePlanMarkdown, PlanExecutorAgent } = await import(${JSON.stringify(utilUrl)})
    ${codeSnippet}
  `

  const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  })

  return JSON.parse(output.trim())
}

describe('Superpowers Plan Executor Agent', () => {
  describe('SUPERPOWERS_AGENT_SYSTEM_PROMPT', () => {
    test('contains core execution rules and step workflow', () => {
      const res = runAgentMethod(`
        console.log(JSON.stringify({
          hasSuperpowers: SUPERPOWERS_AGENT_SYSTEM_PROMPT.includes('Superpowers methodology'),
          hasOneStep: SUPERPOWERS_AGENT_SYSTEM_PROMPT.includes('One Step at a Time'),
          hasStrictAdherence: SUPERPOWERS_AGENT_SYSTEM_PROMPT.includes('Strict Plan Adherence'),
          hasVerify: SUPERPOWERS_AGENT_SYSTEM_PROMPT.includes('Verify Each Increment'),
          hasState: SUPERPOWERS_AGENT_SYSTEM_PROMPT.includes('State:'),
          hasAction: SUPERPOWERS_AGENT_SYSTEM_PROMPT.includes('Action:'),
          hasVerification: SUPERPOWERS_AGENT_SYSTEM_PROMPT.includes('Verification:'),
          hasCheckpoint: SUPERPOWERS_AGENT_SYSTEM_PROMPT.includes('Checkpoint:')
        }))
      `)

      expect(res.hasSuperpowers).toBe(true)
      expect(res.hasOneStep).toBe(true)
      expect(res.hasStrictAdherence).toBe(true)
      expect(res.hasVerify).toBe(true)
      expect(res.hasState).toBe(true)
      expect(res.hasAction).toBe(true)
      expect(res.hasVerification).toBe(true)
      expect(res.hasCheckpoint).toBe(true)
    })
  })

  describe('parsePlanMarkdown', () => {
    test('parses markdown checklist items into PlanSteps', () => {
      const markdown = `
# Implementation Plan

- [x] Step 1: Set up project files
- [ ] Step 2: Implement core logic
- [/] Step 3: Write tests
      `

      const res = runAgentMethod(`
        const steps = parsePlanMarkdown(${JSON.stringify(markdown)})
        console.log(JSON.stringify(steps))
      `)

      expect(res).toHaveLength(3)
      expect(res[0]).toEqual({
        id: 1,
        title: 'Step 1: Set up project files',
        status: 'completed',
      })
      expect(res[1]).toEqual({
        id: 2,
        title: 'Step 2: Implement core logic',
        status: 'pending',
      })
      expect(res[2]).toEqual({
        id: 3,
        title: 'Step 3: Write tests',
        status: 'in_progress',
      })
    })

    test('returns empty array when no steps found', () => {
      const res = runAgentMethod(`
        const steps = parsePlanMarkdown('No checklist items here')
        console.log(JSON.stringify(steps))
      `)
      expect(res).toEqual([])
    })
  })

  describe('PlanExecutorAgent workflow', () => {
    const samplePlan = `
# Test Plan

- [ ] Task 1: Create initial module
- [ ] Task 2: Add validation
    `

    test('initializes and steps through Superpowers workflow successfully', () => {
      const res = runAgentMethod(`
        const agent = new PlanExecutorAgent(${JSON.stringify(samplePlan)})
        const step1 = agent.getCurrentStep()

        const state1 = agent.startCurrentStep()
        const action1 = agent.performAction('Created module file')
        const verification1 = agent.verifyStep('Unit tests passed', true)
        const checkpoint1 = agent.completeCheckpoint('Completed step 1')

        const nextStep = agent.getCurrentStep()

        console.log(JSON.stringify({
          initialTitle: step1.title,
          statePhase: state1.phase,
          actionPhase: action1.phase,
          verificationPhase: verification1.phase,
          verificationResult: verification1.verified,
          checkpointPhase: checkpoint1.phase,
          nextTitle: nextStep ? nextStep.title : null
        }))
      `)

      expect(res.initialTitle).toBe('Task 1: Create initial module')
      expect(res.statePhase).toBe('State')
      expect(res.actionPhase).toBe('Action')
      expect(res.verificationPhase).toBe('Verification')
      expect(res.verificationResult).toBe(true)
      expect(res.checkpointPhase).toBe('Checkpoint')
      expect(res.nextTitle).toBe('Task 2: Add validation')
    })

    test('prevents advancing when step verification fails', () => {
      const res = runAgentMethod(`
        const agent = new PlanExecutorAgent(${JSON.stringify(samplePlan)})
        agent.startCurrentStep()
        agent.performAction('Created file with errors')
        const verification = agent.verifyStep('Build error', false)
        let errorCaught = false

        try {
          agent.completeCheckpoint('Try complete')
        } catch (e) {
          errorCaught = true
        }

        console.log(JSON.stringify({
          verified: verification.verified,
          stepStatus: agent.getCurrentStep().status,
          errorCaught
        }))
      `)

      expect(res.verified).toBe(false)
      expect(res.stepStatus).toBe('failed')
      expect(res.errorCaught).toBe(true)
    })
  })
})
