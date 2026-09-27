import React from 'react'
import { useIsMounted } from '@lib/hooks/useIsMounted'

const NoSSR: React.FC<{
  skeleton?: React.ReactNode
  children: React.ReactNode
}> = ({ children, skeleton }) => {
  const isMounted = useIsMounted()

  if (isMounted) {
    return <>{children}</>
  }
  if (skeleton) {
    return <>{skeleton}</>
  }
  return null
}

export default NoSSR
