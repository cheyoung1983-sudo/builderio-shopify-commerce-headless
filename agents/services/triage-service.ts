import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export interface TriageTicket {
  id: string;
  agentId: string;
  status: "open" | "in_progress" | "resolved" | "merged";
  issueSummary: string;
  conversationId?: string;
  createdAt: string;
}

export class TriageService {
  private client: ElevenLabsClient;

  constructor(apiKey?: string) {
    this.client = new ElevenLabsClient({ apiKey: apiKey || process.env.ELEVENLABS_API_KEY });
  }

  /**
   * List triage tickets for a workspace or agent.
   */
  async listTickets(workspaceId?: string): Promise<TriageTicket[]> {
    // Calls the ElevenLabs ConvAI triage tickets API endpoint
    const response = await (this.client.conversationalAi as any).triageTickets.listForWorkspace({
      workspaceId,
    });
    return response as TriageTicket[];
  }

  /**
   * Update a triage ticket status or add comments.
   */
  async updateTicketStatus(ticketId: string, status: TriageTicket["status"]): Promise<void> {
    await (this.client.conversationalAi as any).triageTickets.update({
      ticketId,
      status,
    });
  }

  /**
   * Add a comment to an agent conversation ticket.
   */
  async addComment(ticketId: string, comment: string): Promise<void> {
    await (this.client.conversationalAi as any).triageTickets.addComment({
      ticketId,
      comment,
    });
  }
}
