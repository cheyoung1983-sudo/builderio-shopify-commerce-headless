import fs from 'node:fs'
import path from 'node:path'
import {
  SUPERPOWERS_AGENT_SYSTEM_PROMPT,
  PlanExecutorAgent,
} from '../lib/agent/planExecutor.ts'

function main() {
  const args = process.argv.slice(2)
  const planPath = args[0]

  if (!planPath) {
    console.log('Superpowers Autonomous Engineer Agent')
    console.log('====================================\n')
    console.log('System Prompt Overview:')
    console.log(SUPERPOWERS_AGENT_SYSTEM_PROMPT)
    console.log('\nUsage:')
    console.log('  node --experimental-strip-types scripts/run-plan-agent.ts <path-to-implementation-plan.md>')
    process.exit(0)
  }

  const resolvedPath = path.resolve(process.cwd(), planPath)
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: Implementation plan file not found at ${resolvedPath}`)
    process.exit(1)
  }

  const markdown = fs.readFileSync(resolvedPath, 'utf8')
  const agent = new PlanExecutorAgent(markdown)
  const steps = agent.getSteps()

  console.log(`Loaded implementation plan: ${planPath}`)
  console.log(`Total steps found: ${steps.length}\n`)

  if (steps.length === 0) {
    console.log('No steps found in plan.')
    return
  }

  const currentStep = agent.getCurrentStep()
  if (currentStep) {
    const stateProgress = agent.startCurrentStep()
    console.log(`[STATE] ${stateProgress.message}`)
  } else if (agent.isComplete()) {
    console.log('All steps in the plan are already completed!')
  }
}

main()
