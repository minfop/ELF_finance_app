import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Button from '../components/Button'
import { buildApiUrl } from '../utils/api'
import { useSearchParams, Link } from 'react-router-dom'

type LineTypeOpt = { id: number; name: string }
type Installment = { id: number; dueAt?: string; createdAt?: string; status?: string; amount?: string }
type Loan = { id: number; customerName: string; customerPhone: string; startDate: string; collectionType: string; collectionPeriod: number; lineTypeId: number; installments?: Installment[]; totalAmount?: number; balanceAmount?: number }

function Lines() {
  const token = useSelector((s: RootState) => s.auth.authToken)
  const [lineTypes, setLineTypes] = useState<LineTypeOpt[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [form, setForm] = useState({ lineTypeId: 0, date: '' })
  const [touched, setTouched] = useState(false)
  const [quickLoanId, setQuickLoanId] = useState<number | null>(null)
  const [quickOnline, setQuickOnline] = useState(false)
  const [quickForm, setQuickForm] = useState({ date: '', amount: 0, cashInOnline: 0, cashInHand: 0 })
  const [searchParams, setSearchParams] = useSearchParams()

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { 
    setForm((s) => ({ ...s, [key]: value }));
    setLoans([]);
    setError(undefined);
   }

  const formErrors = useMemo(() => ({
    lineTypeId: touched && !form.lineTypeId ? 'Line type is required' : '',
    // date: touched && !form.date ? 'Date is required' : '',
  }), [form, touched])

  async function fetchLineTypes() {
    try {
      const res = await fetch(buildApiUrl('line-types/by-user'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const j = await res.json()
      setLineTypes(Array.isArray(j?.data) ? j.data.map((x: any) => ({ id: x.id, name: x.name })) : [])
    } catch {}
  }

  async function fetchLoansByLine(lineTypeId: number) {
    try {
      setLoading(true)
      setError(undefined)
      const res = await fetch(buildApiUrl(`/loans/linetype/${lineTypeId}`), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      const j = await res.json();
      if (j.success) {
        const all: any[] = Array.isArray(j?.data) ? j.data : []
        setLoans(all)
      } else {
        setError(j?.message)
        setLoans([])
      }
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (Object.values(formErrors).some(Boolean)) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('lineTypeId', String(form.lineTypeId))
      return next
    })
    fetchLoansByLine(form.lineTypeId)
  }

  useEffect(() => { fetchLineTypes() }, [])

  // Restore selection from URL on mount
  useEffect(() => {
    const p = Number(searchParams.get('lineTypeId') || 0)
    if (p > 0) {
      setForm((s) => ({ ...s, lineTypeId: p }))
      fetchLoansByLine(p)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function formatDateInput(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate(),).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  async function markMissed(loanId: number) {
    const ok = window.confirm('Mark this installment missed for today?')
    if (!ok) return
    try {
      setLoading(true)
      const res = await fetch(buildApiUrl('/installments/missed'), { method: 'POST', headers: { accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ loanId }) })
      if (!res.ok) throw new Error('Failed to mark missed')
      if (form.lineTypeId) await fetchLoansByLine(form.lineTypeId)
    } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
  }

  function openQuickPay(loanId: number) {
    const today = new Date()
    const fmt = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10)
    const ln = loans.find((x) => x.id === loanId)
    let amt = 0
    if (ln) {
      const anyLn = ln as any
      if (anyLn && anyLn.installmentAmount != null) {
        amt = Number(anyLn.installmentAmount) || 0
      } else {
        const items = Array.isArray(ln.installments) ? ln.installments : []
        const todayStr = fmt(today)
        const todayAmt = items
          .filter((it) => String(it.dueAt || '').slice(0, 10) === todayStr)
          .reduce((s, it) => s + (parseFloat(String(it.amount || 0)) || 0), 0)
        if (todayAmt > 0) amt = todayAmt
        else if (items.length > 0) amt = parseFloat(String(items[0].amount || 0)) || 0
      }
    }
    setQuickLoanId(loanId)
    setQuickOnline(false)
    setQuickForm({ date: formatDateInput(today), amount: amt, cashInOnline: 0, cashInHand: amt })
  }

  useEffect(() => {
    if (!quickOnline) return
    const rem = Math.max(0, quickForm.amount - quickForm.cashInOnline)
    if (rem !== quickForm.cashInHand) setQuickForm((s) => ({ ...s, cashInHand: rem }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickOnline, quickForm.amount, quickForm.cashInOnline])

  async function submitQuickPay(e: FormEvent) {
    e.preventDefault()
    if (!quickLoanId) return
    try {
      setLoading(true)
      const payload = {
        loanId: quickLoanId,
        date: quickForm.date,
        amount: quickForm.amount,
        cashInHand: quickOnline ? quickForm.cashInHand : quickForm.amount,
        cashInOnline: quickOnline ? quickForm.cashInOnline : 0,
      }
      const res = await fetch(buildApiUrl('/installments'), { method: 'POST', headers: { accept: '*/*', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.message || 'Failed to record installment')
      }
      setQuickLoanId(null)
      if (form.lineTypeId) await fetchLoansByLine(form.lineTypeId)
    } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold mb-4">Lines</h1>
      <form onSubmit={onSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">Line Type</label>
          <select className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.lineTypeId} onChange={(e) => update('lineTypeId', Number(e.target.value))}>
            <option value={0}>Select line type</option>
            {lineTypes.map((lt) => (<option key={lt.id} value={lt.id}>{lt.name}</option>))}
          </select>
          {formErrors.lineTypeId && <p className="mt-1 text-xs text-red-600">{formErrors.lineTypeId}</p>}
        </div>
        {/* Date input removed as per user */}
        <div className="flex items-end">
          <Button type="submit" disabled={loading}>{loading ? 'Filtering...' : 'Filter'}</Button>
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-header border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2">Customer</th>
                <th className="text-left px-4 py-2">Phone</th>
                <th className="text-left px-4 py-2">Total Amount</th>
                <th className="text-left px-4 py-2">Balance Amount</th>
                <th className="text-left px-4 py-2">Today</th>
                <th className="text-left px-4 py-2">Installments</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{l.customerName}</td>
                  <td className="px-4 py-2"><a href={`tel:${l.customerPhone}`} className="text-primary hover:underline">{l.customerPhone}</a></td>
                  {/* <td className="px-4 py-2">{l.collectionType}-{l.collectionPeriod}</td> */}
                  <td className="px-4 py-2">{l.totalAmount}</td>
                  <td className="px-4 py-2">{l.balanceAmount}</td>
                  <td className="px-4 py-2">
                    {(() => {
                      const items = Array.isArray(l.installments) ? l.installments : []
                      const today = new Date();
                      const todayStr = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString().slice(0,10)
                      const amt = items
                        .filter((it) => String(it.dueAt || '').slice(0,10) === todayStr)
                        .reduce((s, it) => s + (parseFloat(String(it.amount || 0)) || 0), 0)
                      return `₹ ${amt.toFixed(2)}`
                    })()}
                  </td>
                  <td className="px-4 py-2">
                    {(() => {
                      const items = Array.isArray(l.installments) ? l.installments : []
                      if (items.length === 0) return <span className="text-xs text-gray-500">No installments</span>
                      const colorOf = (st?: string) => {
                        const status = String(st || '').toUpperCase()
                        return status === 'PAID' ? 'bg-green-500' : status === 'MISSED' ? 'bg-red-500' : status === 'PARTIALLY' ? 'bg-amber-500' : 'bg-gray-400'
                      }
                      return (
                        <div className="flex items-center gap-1">
                          {items.map((it, idx) => (
                            <span key={it.id ?? idx} className={`inline-block w-2.5 h-2.5 rounded-full ${colorOf(it.status)}`} />
                          ))}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <Link className="mr-2 text-primary hover:underline" to={`/loans/${l.id}/installments`}>Pay</Link>
                    <button className="mr-2 text-amber-600 hover:text-amber-700" onClick={() => markMissed(l.id)}>Missed</button>
                    <button className="text-green-700 hover:text-green-800" onClick={() => openQuickPay(l.id)}>QuickPay</button>
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-600" colSpan={7}>{loading ? 'Loading...' : 'No loans found.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="md:hidden space-y-3">
        {loans.map((l) => (
          <div key={l.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-gray-900">{l.customerName}</div>
                  <a href={`tel:${l.customerPhone}`} className="inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 bg-white">Call</a>
                </div>
                <div className="mt-2">
                  {(() => {
                    const items = Array.isArray(l.installments) ? l.installments : []
                    if (items.length === 0) return <span className="text-xs text-gray-500">No installments</span>
                    const colorOf = (st?: string) => {
                      const status = String(st || '').toUpperCase()
                      return status === 'PAID' ? 'bg-green-500' : status === 'MISSED' ? 'bg-red-500' : status === 'PARTIALLY' ? 'bg-amber-500' : 'bg-gray-400'
                    }
                    return (
                      <div className="flex items-center gap-1">
                        {items.map((it, idx) => (
                          <span key={it.id ?? idx} className={`inline-block w-2.5 h-2.5 rounded-full ${colorOf(it.status)}`} />
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
              <div className="text-right text-sm text-gray-800">
                <div>Total: ₹ {l.totalAmount}</div>
                <div>Today: {(() => {
                  const items = Array.isArray(l.installments) ? l.installments : []
                  const today = new Date();
                  const todayStr = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString().slice(0,10)
                  const amt = items
                    .filter((it) => String(it.dueAt || '').slice(0,10) === todayStr)
                    .reduce((s, it) => s + (parseFloat(String(it.amount || 0)) || 0), 0)
                  return `₹ ${amt.toFixed(2)}`
                })()}</div>
                <div>Balance: ₹ {l.balanceAmount}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-3">
              <Link className="text-primary hover:underline" to={`/loans/${l.id}/installments`}>Pay</Link>
              <button className="text-amber-600 hover:text-amber-700" onClick={() => markMissed(l.id)}>Missed</button>
              <button className="text-green-700 hover:text-green-800" onClick={() => openQuickPay(l.id)}>QuickPay</button>
            </div>
          </div>
        ))}
        {loans.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">{loading ? 'Loading...' : 'No loans found.'}</div>
        )}
      </div>
      {quickLoanId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setQuickLoanId(null)} />
          <div className="relative bg-white rounded-xl border border-gray-200 p-4 w-full max-w-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Quick Pay</h3>
            {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
            <form onSubmit={submitQuickPay} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input type="date" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={quickForm.date} onChange={(e) => setQuickForm((s) => ({ ...s, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input type="number" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={quickForm.amount} onChange={(e) => setQuickForm((s) => ({ ...s, amount: Number(e.target.value) }))} />
              </div>
              <div className="flex items-center gap-2 mt-7">
                <input type="checkbox" checked={quickOnline} onChange={(e) => setQuickOnline(e.target.checked)} />
                <span className="text-sm text-gray-700">Online payment</span>
              </div>
              {quickOnline && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cash In Online</label>
                    <input type="number" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={quickForm.cashInOnline} onChange={(e) => setQuickForm((s) => ({ ...s, cashInOnline: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cash In Hand</label>
                    <input type="number" disabled className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3 bg-gray-50" value={quickForm.cashInHand} />
                  </div>
                </>
              )}
              <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                <Button type="button" onClick={() => setQuickLoanId(null)} className="bg-gray-200 text-gray-800">Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Mark Paid'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {error && <div className="text-sm text-red-600 mt-4">{error}</div>}
    </section>
  )
}

export default Lines


