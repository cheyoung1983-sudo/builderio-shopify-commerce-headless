'use client'

import React from 'react'
import { AnimatePresence } from 'motion/react'
import { useToast } from '../../../context/ToastContext'
import { ToastItem } from './ToastItem'

export interface ToastContainerProps {
  className?: string
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ className = '' }) => {
  const { toasts, dismissToast } = useToast()

  if (!toasts || toasts.length === 0) return null

  return (
    <aside
      id="global-toast-container"
      aria-label="Notification alerts"
      className={`fixed bottom-5 right-5 z-[99999] pointer-events-none flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full px-4 sm:px-0 ${className}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </AnimatePresence>
    </aside>
  )
}

export default ToastContainer
