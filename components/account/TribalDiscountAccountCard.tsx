import React, { useState, useEffect } from 'react'
import { Award, ShieldCheck, Check, Copy, Clock, RefreshCw, AlertCircle } from 'lucide-react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export interface TribalRegistryRecord {
  enrollmentNumber: string
  tribe: string
  memberName?: string
  claimedByUid: string
  claimedAt?: any
  discountCode?: string
}

export interface TribalDiscountAccountCardProps {
  userUid?: string
  customerEmail?: string
}

export const TribalDiscountAccountCard: React.FC<TribalDiscountAccountCardProps> = ({
  userUid,
  customerEmail,
}) => {
  const [records, setRecords] = useState<TribalRegistryRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [copiedCode, setCopiedCode] = useState<boolean>(false)

  useEffect(() => {
    let isMounted = true

    const fetchRecords = async () => {
      if (!userUid) {
        setLoading(false)
        return
      }

      try {
        const q = query(collection(db, 'tribal_registry'), where('claimedByUid', '==', userUid))
        const querySnapshot = await getDocs(q)
        const fetched: TribalRegistryRecord[] = []

        querySnapshot.forEach((doc) => {
          fetched.push(doc.data() as TribalRegistryRecord)
        })

        if (isMounted) {
          setRecords(fetched)
          setLoading(false)
        }
      } catch (err) {
        console.warn('Error fetching tribal registry records for user:', err)
        if (isMounted) setLoading(false)
      }
    }

    fetchRecords()

    return () => {
      isMounted = false
    }
  }, [userUid])

  const copyDiscountCode = (code: string) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const maskEnrollmentNumber = (num: string) => {
    if (!num) return ''
    if (num.length <= 4) return num
    const prefix = num.substring(0, 2)
    const suffix = num.substring(num.length - 2)
    return `${prefix}****${suffix}`
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs flex items-center justify-center gap-2 text-xs text-neutral-500">
        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
        <span>Loading tribal discount status &amp; validation history...</span>
      </div>
    )
  }

  const hasActiveDiscount = records.length > 0
  const activeRecord = hasActiveDiscount ? records[0] : null

  return (
    <div
      className="rounded-2xl border border-emerald-900/20 bg-linear-to-b from-emerald-50/60 via-white to-white p-6 sm:p-8 shadow-xs"
      data-testid="tribal-discount-account-card"
    >
      <div className="flex items-center justify-between border-b border-emerald-900/10 pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
              AIANA Tribal Discount &amp; Tax Exemption Status
            </h3>
            <p className="text-xs text-neutral-600">
              Verified membership records bound to account ({customerEmail || 'Authenticated Member'})
            </p>
          </div>
        </div>

        {hasActiveDiscount ? (
          <span className="rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold px-3 py-1 inline-flex items-center gap-1.5 border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>20% Active Exemption</span>
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 inline-flex items-center gap-1.5 border border-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            <span>Not Yet Verified</span>
          </span>
        )}
      </div>

      {hasActiveDiscount && activeRecord ? (
        <div className="space-y-6">
          {/* Active Status Box */}
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block mb-0.5">
                Verified Tribal Enrollment Record
              </span>
              <h4 className="text-base font-bold text-emerald-950">{activeRecord.tribe}</h4>
              <p className="text-xs text-emerald-800 mt-0.5 font-mono">
                Enrollment ID: <strong>{maskEnrollmentNumber(activeRecord.enrollmentNumber)}</strong>
                {activeRecord.memberName && ` • Member: ${activeRecord.memberName}`}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-xs font-mono font-bold text-emerald-950">
                {activeRecord.discountCode || 'TRIBAL-MEMBER-20'}
              </span>
              <button
                type="button"
                onClick={() => copyDiscountCode(activeRecord.discountCode || 'TRIBAL-MEMBER-20')}
                className="p-1 rounded-md hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                title="Copy discount code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Validation History Timeline */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Enrollment Number Validation History</span>
            </h4>

            <div className="space-y-2.5">
              {records.map((rec, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-neutral-900 block">{rec.tribe}</strong>
                      <span className="text-[11px] font-mono text-neutral-500">
                        ID: {maskEnrollmentNumber(rec.enrollmentNumber)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900 uppercase">
                      Verified &amp; Bound
                    </span>
                    <span className="block text-[10px] text-neutral-500 mt-0.5 font-mono">
                      Firestore `tribal_registry`
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 space-y-2">
          <p className="text-xs text-neutral-600">
            No tribal enrollment record bound to this account yet. Verify your official tribal ID below to claim your 20% discount.
          </p>
        </div>
      )}
    </div>
  )
}

export default TribalDiscountAccountCard
