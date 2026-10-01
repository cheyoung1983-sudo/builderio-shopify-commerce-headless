import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export class ProceduresManager {
  private client: ElevenLabsClient;

  constructor(apiKey?: string) {
    this.client = new ElevenLabsClient({ apiKey: apiKey || process.env.ELEVENLABS_API_KEY });
  }

  /**
   * Create or update a procedure draft on an agent branch.
   */
  async updateProcedureDraft(agentId: string, branchId: string, procedureId: string, name: string, content: string): Promise<void> {
    await (this.client.conversationalAi.agents.branches.procedures.drafts as any).update({
      agentId,
      branchId,
      procedureId,
      name,
      type: "free_form",
      content,
    });
  }

  /**
   * Compile structured procedures on an agent branch.
   */
  async compileProcedures(agentId: string, branchId: string): Promise<any> {
    return await (this.client.conversationalAi.agents.branches.procedures as any).compile({
      agentId,
      branchId,
    });
  }

  /**
   * Publish pending changes from branch to live agent.
   */
  async publishAgentBranch(agentId: string, branchId: string, workflow?: any): Promise<void> {
    await this.client.conversationalAi.agents.update({
      agentId,
      branchId,
      ...(workflow ? { workflow } : {}),
    } as any);
  }
}
