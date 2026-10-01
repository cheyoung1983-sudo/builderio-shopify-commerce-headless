import React, { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Lock,
} from 'lucide-react'
import {
  McpApprovalPolicy,
  McpToolConfig,
  McpToolExecutionMode,
} from '../../config/mcp'

export interface ToolApprovalSettingsProps {
  policy: McpApprovalPolicy
  tools?: McpToolConfig[]
  onPolicyChange: (policy: McpApprovalPolicy) => void
  onToolConfigChange?: (tools: McpToolConfig[]) => void
  readOnly?: boolean
}

export const ToolApprovalSettings: React.FC<ToolApprovalSettingsProps> = ({
  policy,
  tools = [],
  onPolicyChange,
  onToolConfigChange,
  readOnly = false,
}) => {
  const [activeTools, setActiveTools] = useState<McpToolConfig[]>(tools)
  const currentMode: McpApprovalPolicy =
    typeof policy === 'string' ? policy : (policy as any)?.mode || 'always_ask'

  const handleModeSelect = (mode: McpApprovalPolicy) => {
    if (readOnly) return
    onPolicyChange(mode)
  }

  const handleToolModeChange = (toolName: string, mode: McpToolExecutionMode) => {
    if (readOnly || !onToolConfigChange) return
    const updated = activeTools.map((t) => (t.toolName === toolName ? { ...t, executionMode: mode } : t))
    setActiveTools(updated)
    onToolConfigChange(updated)
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/90 p-5 text-white shadow-xl backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-white">Tool Approval Policy</h3>
            <p className="text-xs text-gray-400">
              Manage how ElevenLabs voice agents execute tools exposed by this MCP server.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-[11px] font-medium text-gray-300">
          ElevenLabs MCP Security
        </span>
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Always Ask */}
        <button
          type="button"
          disabled={readOnly}
          onClick={() => handleModeSelect('always_ask')}
          className={`flex flex-col justify-between rounded-lg border p-3.5 text-left transition-all ${
            currentMode === 'always_ask'
              ? 'border-amber-500 bg-amber-950/20 ring-1 ring-amber-500/50'
              : 'border-gray-800 bg-gray-800/40 hover:border-gray-700 hover:bg-gray-800/70'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-xs font-semibold text-amber-400">
                <Lock className="h-3.5 w-3.5" />
                <span>Always Ask</span>
              </span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                Recommended
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-300">
              Maximum security. The agent requests explicit human confirmation before executing any tool.
            </p>
          </div>
        </button>

        {/* Fine-Grained */}
        <button
          type="button"
          disabled={readOnly}
          onClick={() => handleModeSelect('fine_grained')}
          className={`flex flex-col justify-between rounded-lg border p-3.5 text-left transition-all ${
            currentMode === 'fine_grained'
              ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50'
              : 'border-gray-800 bg-gray-800/40 hover:border-gray-700 hover:bg-gray-800/70'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-xs font-semibold text-blue-400">
                <Sliders className="h-3.5 w-3.5" />
                <span>Fine-Grained</span>
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-300">
              Customize permissions per tool. Auto-run safe read queries while requiring approval for modifications.
            </p>
          </div>
        </button>

        {/* No Approval */}
        <button
          type="button"
          disabled={readOnly}
          onClick={() => handleModeSelect('no_approval')}
          className={`flex flex-col justify-between rounded-lg border p-3.5 text-left transition-all ${
            currentMode === 'no_approval'
              ? 'border-red-500 bg-red-950/20 ring-1 ring-red-500/50'
              : 'border-gray-800 bg-gray-800/40 hover:border-gray-700 hover:bg-gray-800/70'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-xs font-semibold text-red-400">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>No Approval</span>
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-300">
              The assistant can execute any tool without prompts. Use only for vetted, strictly read-only servers.
            </p>
          </div>
        </button>
      </div>

      {/* Warning for No Approval */}
      {currentMode === 'no_approval' && (
        <div className="mt-3 flex items-start space-x-2.5 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-red-200">
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <p className="text-xs">
            <strong>Security Warning:</strong> Enabling unrestricted tool execution allows the agent to execute
            state-changing actions without user verification. Verify the upstream server is trusted.
          </p>
        </div>
      )}

      {/* Fine-Grained Tool Configuration List */}
      {currentMode === 'fine_grained' && activeTools.length > 0 && (
        <div className="mt-4 border-t border-gray-800 pt-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Per-Tool Permissions ({activeTools.length})
          </h4>
          <div className="divide-y divide-gray-800/80 rounded-lg border border-gray-800 bg-black/40">
            {activeTools.map((tool) => (
              <div key={tool.toolName} className="flex items-center justify-between p-3 text-xs">
                <div className="pr-4">
                  <div className="font-mono font-medium text-gray-200">{tool.toolName}</div>
                  {tool.description && <p className="text-[11px] text-gray-400">{tool.description}</p>}
                </div>
                <div className="flex shrink-0 items-center space-x-1.5">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleToolModeChange(tool.toolName, 'auto_approved')}
                    className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      tool.executionMode === 'auto_approved'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Auto-Approve
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleToolModeChange(tool.toolName, 'requires_approval')}
                    className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      tool.executionMode === 'requires_approval'
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Require Approval
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleToolModeChange(tool.toolName, 'disabled')}
                    className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      tool.executionMode === 'disabled'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Disabled
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
