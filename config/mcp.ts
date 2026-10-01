/**
 * Model Context Protocol (MCP) Configuration & Types for ElevenLabs Voice Agents
 */

export interface McpServerConfig {
  name: string
  description: string
  serverUrl: string
  transport: 'SSE' | 'HTTP'
  approvalPolicy: 'always_ask' | 'fine_grained' | 'no_approval'
}

export interface McpAuthState {
  secretToken?: string
  headers?: Record<string, string>
}

export interface WorkspaceMcpSettings {
  canUseMcpServers: boolean
}

export type McpTransport = 'SSE' | 'HTTP'
export type McpApprovalPolicy = 'always_ask' | 'fine_grained' | 'no_approval'
export type McpToolExecutionMode = 'auto_approved' | 'requires_approval' | 'disabled'

export interface McpToolConfig {
  toolName: string
  executionMode: McpToolExecutionMode
  description?: string
  timeoutSecs?: number
  isReadOnly?: boolean
}

export const DEFAULT_MCP_APPROVAL_POLICY: McpApprovalPolicy = 'always_ask'

export const DEFAULT_MCP_WORKSPACE_SETTINGS: WorkspaceMcpSettings & {
  can_use_mcp_servers?: boolean
  zeroRetentionModeActive?: boolean
  hipaaComplianceActive?: boolean
} = {
  canUseMcpServers: true,
  can_use_mcp_servers: true,
  zeroRetentionModeActive: false,
  hipaaComplianceActive: false,
}

/**
 * Checks whether MCP integration is permitted for the workspace under Zero Retention Mode (ZRM)
 * and HIPAA constraints.
 */
export function isMcpAllowedForWorkspace(settings?: Partial<WorkspaceMcpSettings> & {
  can_use_mcp_servers?: boolean
  zeroRetentionModeActive?: boolean
  hipaaComplianceActive?: boolean
}): {
  allowed: boolean
  reason?: string
} {
  const current = { ...DEFAULT_MCP_WORKSPACE_SETTINGS, ...(settings || {}) }
  const isEnabled =
    typeof settings?.canUseMcpServers === 'boolean'
      ? settings.canUseMcpServers
      : typeof settings?.can_use_mcp_servers === 'boolean'
        ? settings.can_use_mcp_servers
        : current.canUseMcpServers

  if (!isEnabled) {
    return {
      allowed: false,
      reason: 'MCP servers are disabled for this workspace (can_use_mcp_servers is false).',
    }
  }

  if (current.zeroRetentionModeActive) {
    return {
      allowed: false,
      reason: 'MCP support is not available when Zero Retention Mode is enabled on the workspace.',
    }
  }

  if (current.hipaaComplianceActive) {
    return {
      allowed: false,
      reason: 'MCP integrations are not permitted on workspaces requiring HIPAA compliance.',
    }
  }

  return { allowed: true }
}

/**
 * Validates an MCP server configuration.
 */
export function validateMcpServerConfig(config: Partial<McpServerConfig> & { url?: string; [key: string]: any }): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!config.name || typeof config.name !== 'string' || !config.name.trim()) {
    errors.push('MCP server name is required')
  }

  const targetUrl = config.serverUrl || config.url

  if (!targetUrl || typeof targetUrl !== 'string') {
    errors.push('MCP server URL is required')
  } else {
    try {
      const parsed = new URL(targetUrl)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        errors.push('MCP server URL must use HTTP or HTTPS protocol')
      }
    } catch {
      errors.push('Invalid MCP server URL')
    }
  }

  if (config.transport && !['SSE', 'HTTP'].includes(config.transport)) {
    errors.push("MCP transport must be either 'SSE' or 'HTTP'")
  }

  const approvalMode =
    typeof config.approvalPolicy === 'string'
      ? config.approvalPolicy
      : (config.approvalPolicy as any)?.mode

  if (
    approvalMode &&
    !['always_ask', 'fine_grained', 'no_approval'].includes(approvalMode)
  ) {
    errors.push("Approval mode must be 'always_ask', 'fine_grained', or 'no_approval'")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Strips sensitive authorization details from headers for safe logging/inspection.
 */
export function sanitizeMcpHeaders(headers?: Record<string, string>): Record<string, string> {
  if (!headers) return {}
  const sanitized: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase()
    if (
      lowerKey.includes('authorization') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('key')
    ) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}
