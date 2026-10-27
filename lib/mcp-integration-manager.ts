/**
 * MCP Integration Manager
 * Loads MCP server configurations and coordinates initialization, validation,
 * and health checking across all platform integrations (Shopify, Persona, Stripe,
 * Auth0, Builder.io, ElevenLabs, Slack, Sentry, and Chrome DevTools).
 */

import mcpServerConfig from '../agents/config/mcp-server-config.json'
import mcpRootConfig from '../.mcp.json'
import shopifyConfig from '../config/shopify'
import builderConfig from '../config/builder'

export interface IntegrationStatus {
  id: string
  name: string
  configured: boolean
  mcpServerUrl: string
  authType: string
  error?: string
}

export interface PlatformIntegrationsReport {
  timestamp: string
  allHealthy: boolean
  integrations: IntegrationStatus[]
}

/**
 * Validates and configures all platform integrations using MCP server definitions
 * and environment settings.
 */
export function configureAllIntegrations(): PlatformIntegrationsReport {
  const integrations: IntegrationStatus[] = []
  const servers = (mcpServerConfig as any).mcp_servers || []

  for (const server of servers) {
    let configured = true
    let error: string | undefined

    switch (server.id) {
      case 'mcp_shopify_storefront':
        if (!shopifyConfig.domain || (!shopifyConfig.storefrontAccessToken && !shopifyConfig.adminAccessToken)) {
          configured = false
          error = 'Shopify domain or API token missing'
        }
        break
      case 'mcp_persona_identity':
        if (!process.env.PERSONA_API_KEY) {
          configured = false
          error = 'PERSONA_API_KEY missing'
        }
        break
      case 'mcp_stripe_identity':
        if (!process.env.STRIPE_IDENTITY_RESTRICTED_KEY && !process.env.STRIPE_SECRET_KEY) {
          configured = false
          error = 'Stripe API key missing'
        }
        break
      case 'mcp_auth0_identity':
        if (!process.env.AUTH0_SECRET || !process.env.AUTH0_CLIENT_ID) {
          configured = false
          error = 'Auth0 credentials missing'
        }
        break
      case 'mcp_builder_io':
        if (!builderConfig.apiKey) {
          configured = false
          error = 'Builder.io API key missing'
        }
        break
      case 'mcp_elevenlabs_voice':
        if (!process.env.ELEVENLABS_API_KEY && !process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID) {
          // ElevenLabs is optional for local dev unless voice agents are active
          configured = true
        }
        break
      case 'mcp_slack_notifications':
        if (!process.env.SLACK_WEBHOOK_URL && !process.env.SLACK_BOT_TOKEN) {
          configured = false
          error = 'Slack webhook or bot token missing'
        }
        break
      case 'mcp_sentry_observability':
        if (!process.env.NEXT_PUBLIC_SENTRY_DSN && !process.env.SENTRY_DSN) {
          configured = true // Optional telemetry
        }
        break
      case 'mcp_chrome_devtools':
        configured = true
        break
      default:
        configured = true
        break
    }

    integrations.push({
      id: server.id,
      name: server.name,
      configured,
      mcpServerUrl: server.url,
      authType: server.auth_type || 'none',
      error,
    })
  }

  const allHealthy = integrations.every((i) => i.configured)

  return {
    timestamp: new Date().toISOString(),
    allHealthy,
    integrations,
  }
}

/**
 * Returns the root MCP configuration from .mcp.json
 */
export function getRootMcpConfiguration() {
  return mcpRootConfig
}

/**
 * Returns the server-specific MCP configuration from agents/config/mcp-server-config.json
 */
export function getServerMcpConfiguration() {
  return mcpServerConfig
}
