'use client'

import React, { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Lock,
  AlertTriangle,
  Info,
  Check,
} from 'lucide-react'
import {
  McpApprovalPolicy,
  McpToolConfig,
  McpToolExecutionMode,
} from '../../config/mcp'

export type ApprovalPolicyMode = McpApprovalPolicy

export interface ApprovalSettingsProps {
  currentPolicy?: ApprovalPolicyMode
  policy?: ApprovalPolicyMode
  value?: ApprovalPolicyMode
  onChange?: (mode: ApprovalPolicyMode) => void
  onPolicyChange?: (mode: ApprovalPolicyMode) => void
  readOnly?: boolean
  disabled?: boolean
  serverName?: string
  tools?: McpToolConfig[]
  onToolConfigChange?: (tools: McpToolConfig[]) => void
  className?: string
}

export interface PolicyOptionMeta {
  mode: ApprovalPolicyMode
  label: string
  badge?: string
  badgeColor?: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  activeBorder: string
  activeBg: string
}

export const APPROVAL_POLICY_OPTIONS: PolicyOptionMeta[] = [
  {
    mode: 'always_ask',
    label: 'Always Ask',
    badge: 'Recommended',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    description: 'Requires explicit human confirmation before the agent executes any tool.',
    icon: Lock,
    iconColor: 'text-emerald-400',
    activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
    activeBg: 'bg-emerald-950/20',
  },
  {
    mode: 'fine_grained',
    label: 'Fine-Grained',
    badge: 'Flexible',
    badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    description: 'Customize permissions per tool. Auto-run safe read queries and require approval for writes.',
    icon: Sliders,
    iconColor: 'text-blue-400',
    activeBorder: 'border-blue-500 ring-2 ring-blue-500/20',
    activeBg: 'bg-blue-950/20',
  },
  {
    mode: 'no_approval',
    label: 'No Approval',
    badge: 'High Risk',
    badgeColor: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    description: 'Autonomous tool execution without prompts. Use only for vetted, strictly read-only tools.',
    icon: ShieldAlert,
    iconColor: 'text-rose-400',
    activeBorder: 'border-rose-500 ring-2 ring-rose-500/20',
    activeBg: 'bg-rose-950/20',
  },
]

/**
 * Helper to get human-readable label for a policy mode
 */
export function formatApprovalPolicyLabel(mode: ApprovalPolicyMode): string {
  switch (mode) {
    case 'always_ask':
      return 'Always Ask'
    case 'fine_grained':
      return 'Fine-Grained'
    case 'no_approval':
      return 'No Approval'
    default:
      return mode
  }
}

/**
 * Helper to get detailed explanation of the policy
 */
export function getApprovalPolicyDescription(mode: ApprovalPolicyMode): string {
  const found = APPROVAL_POLICY_OPTIONS.find((opt) => opt.mode === mode)
  return found ? found.description : ''
}

/**
 * ApprovalSettings Component
 * Displays and allows switching between 'Always Ask', 'Fine-Grained', and 'No Approval' modes.
 */
export const ApprovalSettings: React.FC<ApprovalSettingsProps> = ({
  currentPolicy,
  policy,
  value,
  onChange,
  onPolicyChange,
  readOnly = false,
  disabled = false,
  serverName,
  tools = [],
  onToolConfigChange,
  className = '',
}) => {
  const initialMode: ApprovalPolicyMode =
    currentPolicy || policy || value || 'always_ask'

  const [internalMode, setInternalMode] = useState<ApprovalPolicyMode>(initialMode)
  const [toolConfigs, setToolConfigs] = useState<McpToolConfig[]>(tools)

  // Support controlled or uncontrolled mode
  const activeMode: ApprovalPolicyMode =
    currentPolicy || policy || value || internalMode

  const isInteractive = !readOnly && !disabled

  const handleSelectMode = (selected: ApprovalPolicyMode) => {
    if (!isInteractive) return
    setInternalMode(selected)
    onChange?.(selected)
    onPolicyChange?.(selected)
  }

  const handleToolModeToggle = (toolName: string, mode: McpToolExecutionMode) => {
    if (!isInteractive || !onToolConfigChange) return
    const updated = toolConfigs.map((t) =>
      t.toolName === toolName ? { ...t, executionMode: mode } : t
    )
    setToolConfigs(updated)
    onToolConfigChange(updated)
  }

  return (
    <div
      className={`rounded-2xl border border-gray-800 bg-gray-900/90 p-5 text-gray-100 shadow-xl backdrop-blur-md ${className}`}
      data-testid="mcp-approval-settings"
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-gray-800/80 pb-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              Tool Approval Settings
            </h3>
            <p className="text-xs text-gray-400">
              {serverName
                ? `Approval policy for "${serverName}" MCP tools`
                : 'Control agent tool execution authorization in conversation'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center rounded-full bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-gray-300">
            Current: {formatApprovalPolicyLabel(activeMode)}
          </span>
        </div>
      </div>

      {/* Mode Toggle Cards */}
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Tool Approval Policies"
      >
        {APPROVAL_POLICY_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = activeMode === option.mode

          return (
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!isInteractive}
              onClick={() => handleSelectMode(option.mode)}
              data-testid={`approval-mode-${option.mode}`}
              className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                !isInteractive ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-gray-700 hover:bg-gray-800/60'
              } ${
                isSelected
                  ? `${option.activeBorder} ${option.activeBg}`
                  : 'border-gray-800/80 bg-gray-950/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`flex items-center space-x-2 font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    <Icon className={`h-4 w-4 ${option.iconColor}`} />
                    <span>{option.label}</span>
                  </span>
                  {isSelected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>

                {option.badge && (
                  <div className="mb-2">
                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${option.badgeColor}`}>
                      {option.badge}
                    </span>
                  </div>
                )}

                <p className="text-xs leading-relaxed text-gray-400">
                  {option.description}
                </p>
              </div>

              {/* Active indicator bar */}
              <div
                className={`mt-4 h-1 w-full rounded-full transition-all ${
                  isSelected ? 'bg-current opacity-70 ' + option.iconColor : 'bg-transparent'
                }`}
              />
            </button>
          )
        })}
      </div>

      {/* No Approval Warning Banner */}
      {activeMode === 'no_approval' && (
        <div
          data-testid="no-approval-warning"
          className="mt-4 flex items-start space-x-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 text-xs text-rose-200"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-300">Security Warning: Unrestricted Execution</p>
            <p className="text-rose-200/90 leading-relaxed">
              With <strong>No Approval</strong> selected, the ElevenLabs agent will invoke tools and write operations
              automatically without human confirmation. Ensure this MCP server does not expose sensitive or destructive APIs.
            </p>
          </div>
        </div>
      )}

      {/* Always Ask Recommended Info */}
      {activeMode === 'always_ask' && (
        <div className="mt-4 flex items-start space-x-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-300">
          <Info className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Optimal Security:</strong> The voice agent will pause and request clear approval before each action,
            preventing unintended purchases, data updates, or external webhooks.
          </p>
        </div>
      )}

      {/* Fine-Grained Tool Permissions Section */}
      {activeMode === 'fine_grained' && toolConfigs.length > 0 && (
        <div className="mt-5 border-t border-gray-800/80 pt-4" data-testid="fine-grained-tool-list">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Tool Permissions ({toolConfigs.length})
            </h4>
            <span className="text-[11px] text-gray-500">Configure per-tool authorization</span>
          </div>

          <div className="divide-y divide-gray-800/60 rounded-xl border border-gray-800 bg-gray-950/60 overflow-hidden">
            {toolConfigs.map((tool) => (
              <div
                key={tool.toolName}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 gap-2 text-xs"
              >
                <div>
                  <div className="font-mono font-medium text-gray-200">{tool.toolName}</div>
                  {tool.description && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{tool.description}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center space-x-1.5 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={!isInteractive}
                    onClick={() => handleToolModeToggle(tool.toolName, 'auto_approved')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      tool.executionMode === 'auto_approved'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Auto-Approve
                  </button>
                  <button
                    type="button"
                    disabled={!isInteractive}
                    onClick={() => handleToolModeToggle(tool.toolName, 'requires_approval')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      tool.executionMode === 'requires_approval'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Require Approval
                  </button>
                  <button
                    type="button"
                    disabled={!isInteractive}
                    onClick={() => handleToolModeToggle(tool.toolName, 'disabled')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      tool.executionMode === 'disabled'
                        ? 'bg-rose-700 text-white shadow-sm'
                        : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'
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

export default ApprovalSettings
