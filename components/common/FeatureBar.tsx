import React, { useEffect, useState } from 'react'
import { Box, jsx } from 'theme-ui'

interface FeatureBarProps {
  className?: string
  title: string
  description?: string
  hide?: boolean
  action?: React.ReactNode
  delay?: number
}

/**
 * Non-blocking notice bar (used for the cookie notice). It is a plain fixed
 * bar at the bottom of the viewport, not a modal: no overlay, no focus lock,
 * and it stacks below the cart drawers (z-50/60) so it never covers cart
 * controls. Consent behavior is unchanged: it shows until `hide` is true.
 */
const FeatureBar: React.FC<FeatureBarProps> = ({
  title,
  description,
  action,
  hide,
  delay,
}) => {
  const [delayPassed, setDelayPassed] = useState(false)
  useEffect(() => {
    const timeout = setTimeout(() => setDelayPassed(true), delay || 6000)
    return () => clearTimeout(timeout)
  }, [delay])
  if (!delayPassed || hide) return null
  return (
    <Box
      role="region"
      aria-label="Cookie notice"
      data-testid="feature-bar"
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        px: 3,
        py: 2,
        bg: 'background',
        color: 'text',
        borderTop: '1px solid',
        borderColor: 'muted',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
        fontSize: 1,
      }}
    >
      <span>{title}</span>
      {description}
      {action && action}
    </Box>
  )
}

export default FeatureBar
