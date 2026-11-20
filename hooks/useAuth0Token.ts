'use client'

import { useState, useEffect } from 'react'

export function useAuth0Token() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await fetch('/api/auth/token')
        if (res.ok) {
          const data = await res.json()
          setToken(data.accessToken)
        } else if (res.status === 401) {
          // Expected if not logged in
          setToken(null)
        } else {
          setError('Failed to fetch authentication token')
        }
      } catch (err) {
        setError('Network error while fetching token')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    void fetchToken()
  }, [])

  return { token, loading, error }
}
