import React, { useEffect, useState } from 'react'

const NoSSR: React.FC<{
  skeleton?: React.ReactNode
  children: React.ReactNode
}> = ({ children, skeleton }) => {
  const [render, setRender] = useState(false)
  // Must run once after the client-side render to distinguish it from SSR
  // output — that's this component's entire purpose, so there is no
  // derived-state equivalent.
   
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setRender(true), [])
  if (render) {
    return <>{children}</>
  }
  if (skeleton) {
    return <>{skeleton}</>
  }
  return null
}
export default NoSSR
