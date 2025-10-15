import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Button from '../components/Button'
import { buildApiUrl } from '../utils/api'

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
      const res = await fetch(buildApiUrl('/line-types'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const j = await res.json()
      setLineTypes(Array.isArray(j?.data) ? j.data.map((x: any) => ({ id: x.id, name: x.name })) : [])
    } catch {}
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (Object.values(formErrors).some(Boolean)) return
    try {
      setLoading(true)
      setError(undefined)
      // filter client-side using loans list if API for filtering not available
      const res = await fetch(buildApiUrl(`/loans/linetype/${form.lineTypeId}`), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      //if (!res.ok) throw new Error('Failed to load loans')
      const j = await res.json();
      if(j.success) {
      const all: any[] = Array.isArray(j?.data) ? j.data : []
      // const filtered = all.filter((l) => Number(l.lineTypeId) === Number(form.lineTypeId))
      setLoans(all)
      } else {
        setError(j?.message);
        setLoans([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchLineTypes() }, [])

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
        {/* <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input type="date" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.date} onChange={(e) => update('date', e.target.value)} />
          {formErrors.date && <p className="mt-1 text-xs text-red-600">{formErrors.date}</p>}
        </div> */}
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
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-600" colSpan={4}>{loading ? 'Loading...' : 'No loans found.'}</td>
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
          </div>
        ))}
        {loans.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">{loading ? 'Loading...' : 'No loans found.'}</div>
        )}
      </div>
      {error && <div className="text-sm text-red-600 mt-4">{error}</div>}
    </section>
  )
}

export default Lines


