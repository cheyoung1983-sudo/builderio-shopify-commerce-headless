import { SUPERPOWERS_AGENT_SYSTEM_PROMPT } from './prompts/superpowersAgentPrompt.ts'

export { SUPERPOWERS_AGENT_SYSTEM_PROMPT }

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

export interface PlanStep {
  id: number
  title: string
  status: StepStatus
  details?: string
}

export type WorkflowPhase = 'State' | 'Action' | 'Verification' | 'Checkpoint'

export interface StepProgress {
  phase: WorkflowPhase
  step: PlanStep | null
  message: string
  verified?: boolean
}

/**
 * Parses markdown task lists (- [ ], - [/], - [x]) into PlanSteps
 */
export function parsePlanMarkdown(markdown: string): PlanStep[] {
  if (!markdown || typeof markdown !== 'string') {
    return []
  }

  const steps: PlanStep[] = []
  const taskRegex = /^\s*-\s*\[([ x\/])\]\s*(.+)$/gm

  let match: RegExpExecArray | null
  let id = 1

  while ((match = taskRegex.exec(markdown)) !== null) {
    const mark = match[1]
    const title = match[2].trim()

    let status: StepStatus = 'pending'
    if (mark === 'x' || mark === 'X') {
      status = 'completed'
    } else if (mark === '/') {
      status = 'in_progress'
    }

    steps.push({
      id: id++,
      title,
      status,
    })
  }

  return steps
}

/**
 * Autonomous Software Engineer Agent implementing Superpowers plan execution workflow.
 */
export class PlanExecutorAgent {
  private steps: PlanStep[]
  private currentStepIndex: number
  private currentPhase: WorkflowPhase | null = null
  private currentStepVerified: boolean = false

  constructor(planMarkdown: string) {
    this.steps = parsePlanMarkdown(planMarkdown)
    this.currentStepIndex = this.steps.findIndex((s) => s.status !== 'completed')
    if (this.currentStepIndex === -1 && this.steps.length > 0) {
      this.currentStepIndex = 0
    }
  }

  public getSteps(): PlanStep[] {
    return this.steps
  }

  public getCurrentStep(): PlanStep | null {
    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.steps.length) {
      return null
    }
    return this.steps[this.currentStepIndex]
  }

  /**
   * Phase 1: State
   * Declare which step of the plan is currently being addressed.
   */
  public startCurrentStep(): StepProgress {
    const step = this.getCurrentStep()
    if (!step) {
      throw new Error('No remaining steps to execute.')
    }

    step.status = 'in_progress'
    this.currentPhase = 'State'
    this.currentStepVerified = false

    return {
      phase: 'State',
      step,
      message: `State: Addressing step ${step.id}: "${step.title}"`,
    }
  }

  /**
   * Phase 2: Action
   * Perform the precise code edit or file creation required.
   */
  public performAction(actionDescription: string): StepProgress {
    if (this.currentPhase !== 'State') {
      this.startCurrentStep()
    }

    this.currentPhase = 'Action'
    const step = this.getCurrentStep()

    return {
      phase: 'Action',
      step,
      message: `Action: ${actionDescription}`,
    }
  }

  /**
   * Phase 3: Verification
   * Run tests or builds to confirm correctness.
   */
  public verifyStep(verificationDetails: string, passed: boolean = true): StepProgress {
    const step = this.getCurrentStep()
    this.currentPhase = 'Verification'
    this.currentStepVerified = passed

    if (step) {
      step.status = passed ? 'in_progress' : 'failed'
    }

    return {
      phase: 'Verification',
      step,
      verified: passed,
      message: `Verification: ${verificationDetails} (${passed ? 'PASSED' : 'FAILED'})`,
    }
  }

  /**
   * Phase 4: Checkpoint
   * Summarize progress and proceed to the next step in the plan.
   */
  public completeCheckpoint(summary: string): StepProgress {
    const step = this.getCurrentStep()

    if (!step || !this.currentStepVerified) {
      throw new Error('Cannot complete checkpoint: Step verification failed or incomplete')
    }

    step.status = 'completed'
    step.details = summary
    this.currentPhase = 'Checkpoint'

    const completedProgress: StepProgress = {
      phase: 'Checkpoint',
      step: { ...step },
      message: `Checkpoint: ${summary}. Moving to next step.`,
    }

    // Advance to next non-completed step
    this.currentStepIndex = this.steps.findIndex((s) => s.status !== 'completed')
    this.currentPhase = null
    this.currentStepVerified = false

    return completedProgress
  }

  public isComplete(): boolean {
    return this.steps.length > 0 && this.steps.every((s) => s.status === 'completed')
  }
}
