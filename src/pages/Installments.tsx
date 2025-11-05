import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Button from '../components/Button'
import Loader from '../components/Loader'
import { buildApiUrl } from '../utils/api'

type Installment = {
  id: number
  loanId: number
  dueAt: string
  amount: number
  cashInHand?: number
  cashInOnline?: number
  status?: string
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function Installments() {
  const { loanId } = useParams()
  const navigate = useNavigate()
  const token = useSelector((s: RootState) => s.auth.authToken)
  const [items, setItems] = useState<Installment[]>([])
  const [header, setHeader] = useState<{ customerName: string; customerPhone: string; totalAmount: number; balanceAmount: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [online, setOnline] = useState(false)
  const [form, setForm] = useState({
    loanId: Number(loanId) || 0,
    date: formatDateInput(new Date()),
    amount: 0,
    cashInHand: 0,
    cashInOnline: 0,
  })
  const [touched, setTouched] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  const formErrors = useMemo(() => ({
    amount: touched && form.amount <= 0 ? 'Amount must be > 0' : '',
    date: touched && !form.date ? 'Date is required' : '',
  }), [form, touched])

  async function fetchList() {
    try {
      setLoading(true)
      setError(undefined)
      // try query param style
      let res = await fetch(buildApiUrl(`installments/loan/${loanId}`), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        // fallback to nested route if backend differs
        res = await fetch(buildApiUrl(`/loans/${loanId}/installments`), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      }
      if (res.ok) {
        const j = await res.json()
        setItems(Array.isArray(j?.data) ? j.data : [])
      }
      // fetch loan header details for amounts and customer
      const loanRes = await fetch(buildApiUrl(`/loans`), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (loanRes.ok) {
        const lj = await loanRes.json()
        const found = (Array.isArray(lj?.data) ? lj.data : []).find((x: any) => Number(x.id) === Number(loanId))
        if (found) {
          setHeader({ customerName: found.customerName, customerPhone: found.customerPhone, totalAmount: Number(found.totalAmount || 0), balanceAmount: Number(found.balanceAmount || 0) })
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load installments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId])

  // Keep cashInHand aligned with amount - cashInOnline when online is enabled
  useEffect(() => {
    if (!online) return
    const rem = Math.max(0, form.amount - form.cashInOnline)
    if (rem !== form.cashInHand) update('cashInHand', rem)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, form.amount, form.cashInOnline])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    const hasErrors = Object.values(formErrors).some(Boolean)
    if (hasErrors) return
    try {
      setLoading(true)
      const payload = {
        loanId: form.loanId,
        date: form.date,
        amount: form.amount,
        cashInHand: online ? form.cashInHand : form.amount,
        cashInOnline: online ? form.cashInOnline : 0,
      }
      const res = await fetch(buildApiUrl('/installments'), {
        method: 'POST',
        headers: { accept: '*/*', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.message || 'Failed to record installment')
      }
      // On success, go back to the previous page
      navigate(-1)
      return
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Installments - Loan #{loanId}</h1>
        <Button onClick={() => navigate(-1)} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Back</Button>
      </div>

      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Record Payment</h2>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            <div className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3 bg-gray-50 flex items-center">
              {header ? (
                <>
                  <span className="font-medium text-gray-900">{header.customerName}</span>
                  <span className="ml-2 text-gray-600">(<a href={header.customerPhone ? `tel:${header.customerPhone}` : '#'} className="text-primary hover:underline">{header.customerPhone || 'N/A'}</a>)</span>
                </>
              ) : (
                <>Loading...</>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Amount</label>
            <input disabled className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3 bg-gray-50" value={header ? header.totalAmount : ''} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Balance Amount</label>
            <input disabled className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3 bg-gray-50" value={header ? header.balanceAmount : ''} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input type="date" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.date} onChange={(e) => update('date', e.target.value)} />
            {formErrors.date && <p className="mt-1 text-xs text-red-600">{formErrors.date}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount Due</label>
            <input type="number" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.amount} onChange={(e) => update('amount', Number(e.target.value))} />
            {formErrors.amount && <p className="mt-1 text-xs text-red-600">{formErrors.amount}</p>}
          </div>
          <div className="flex items-center gap-2 mt-7">
            <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} />
            <span className="text-sm text-gray-700">Online payment</span>
          </div>
          {online && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cash In Online</label>
                <input type="number" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.cashInOnline} onChange={(e) => update('cashInOnline', Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cash In Hand</label>
                <input type="number" disabled className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3 bg-gray-50" value={form.cashInHand} />
              </div>
            </>
          )}
          <div className="md:col-span-4">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Mark Paid'}</Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-header border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Amount</th>
                <th className="text-left px-4 py-2">Cash In Hand</th>
                <th className="text-left px-4 py-2">Cash In Online</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{String(it.dueAt).slice(0,10)}</td>
                  <td className="px-4 py-2">₹ {it.amount}</td>
                  <td className="px-4 py-2">₹ {it.cashInHand ?? 0}</td>
                  <td className="px-4 py-2">₹ {it.cashInOnline ?? 0}</td>
                  <td className="px-4 py-2">{it.status || 'PAID'}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-600" colSpan={5}>
                    {loading ? 'Loading...' : 'No installments found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="md:hidden space-y-3">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900">{String(it.dueAt).slice(0,10)}</div>
              <span className="text-xs rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-gray-700">{it.status || 'PAID'}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-700">
              <div>Amount: ₹ {it.amount}</div>
              <div>Hand: ₹ {it.cashInHand ?? 0}</div>
              <div>Online: ₹ {it.cashInOnline ?? 0}</div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">
            {loading ? 'Loading...' : 'No installments found.'}
          </div>
        )}
      </div>
      <Loader show={loading} text={loading ? 'Loading...' : undefined} />
    </section>
  )
}

export default Installments


