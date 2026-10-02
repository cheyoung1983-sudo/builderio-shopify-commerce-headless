import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db, handleFirestoreError, OperationType } from '../../lib/firebase'
import { Wrench } from 'lucide-react'

export interface RepairRequestHistoryProps {
  email: string
  className?: string
}

export const RepairRequestHistory: React.FC<RepairRequestHistoryProps> = ({ email, className = '' }) => {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRepairRequests() {
      if (!email) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const q = query(
          collection(db, 'repair_requests'),
          where('shippingKit.email', '==', email)
        )
        const querySnapshot = await getDocs(q)
        const fetchedRequests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setRequests(fetchedRequests)
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, 'repair_requests')
        setError('Failed to load repair history.')
      } finally {
        setLoading(false)
      }
    }
    fetchRepairRequests()
  }, [email])

  if (loading) return <div className="text-sm text-neutral-500">Loading repair history...</div>
  if (error) return <div className="text-sm text-red-600">{error}</div>
  if (requests.length === 0) return <div className="text-sm text-neutral-500">No past repair requests found.</div>

  return (
    <div className={`space-y-4 ${className}`}>
      <h2 className="text-lg font-bold text-neutral-900">Repair History</h2>
      {requests.map((request) => (
        <div key={request.id} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-100 text-neutral-700">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-neutral-900">{request.itemDetails?.deviceModel || 'Unknown Device'}</p>
              <p className="text-xs text-neutral-500">RMS: {request.rmsNumber}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">{request.status}</p>
            <p className="text-xs text-neutral-500">{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
