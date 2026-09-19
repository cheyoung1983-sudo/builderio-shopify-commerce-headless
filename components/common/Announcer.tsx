import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface AnnouncerContextType {
  announce: (message: string, politeness?: 'polite' | 'assertive') => void
}

const AnnouncerContext = createContext<AnnouncerContextType | undefined>(undefined)

export const AnnouncerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState('')
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite')

  const announce = useCallback((msg: string, type: 'polite' | 'assertive' = 'polite') => {
    setMessage('')
    setPoliteness(type)
    // Small timeout to ensure screen readers pick up duplicate messages if announced sequentially
    setTimeout(() => {
      setMessage(msg)
    }, 50)
  }, [])

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div
        role="status"
        aria-live={politeness}
        aria-atomic="true"
        className="sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
      >
        {message}
      </div>
    </AnnouncerContext.Provider>
  )
}

export const useAnnouncer = () => {
  const context = useContext(AnnouncerContext)
  if (!context) {
    throw new Error('useAnnouncer must be used within an AnnouncerProvider')
  }
  return context
}

export default AnnouncerProvider
