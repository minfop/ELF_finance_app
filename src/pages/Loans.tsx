import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Button from '../components/Button'
import { buildApiUrl } from '../utils/api'

type Loan = {
  id: number
  tenantId: number
  customerId: number
  principal: string
  interest: string
  disbursedAmount: string
  loanTypeId: number
  totalInstallment: number
  startDate: string
  endDate: string
  installmentAmount: string
  isActive: any
  status: string
  createdAt: string
  tenantName: string
  customerName: string
  customerPhone: string
  collectionType: string
  collectionPeriod: number
}

type CustomerOpt = { id: number; name: string; phoneNumber: string }
type LoanTypeOpt = { id: number; collectionType: string; collectionPeriod: number }

function Loans() {
  const token = useSelector((s: RootState) => s.auth.authToken)
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const isEditing = editingId !== null

  const [customers, setCustomers] = useState<CustomerOpt[]>([])
  const [loanTypes, setLoanTypes] = useState<LoanTypeOpt[]>([])
  const [customerQuery, setCustomerQuery] = useState('')

  const [form, setForm] = useState({
    customerId: 0,
    principal: 0,
    interest: 0,
    loanTypeId: 0,
    startDate: '',
    status: 'ONGOING',
  })
  const [touched, setTouched] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  const formErrors = useMemo(() => ({
    customerId: touched && !form.customerId ? 'Customer is required' : '',
    principal: touched && (!form.principal || form.principal <= 0) ? 'Principal > 0' : '',
    interest: touched && form.interest < 0 ? 'Interest must be >= 0' : '',
    loanTypeId: touched && !form.loanTypeId ? 'Loan type is required' : '',
    startDate: touched && !form.startDate ? 'Start date is required' : '',
  }), [form, touched])

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phoneNumber.toLowerCase().includes(q))
  }, [customers, customerQuery])

  async function fetchLoans() {
    try {
      setLoading(true)
      setError(undefined)
      const res = await fetch(buildApiUrl('/loans'), {
        headers: { accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load loans')
      const json = await res.json()
      setLoans(Array.isArray(json?.data) ? json.data : [])
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally { setLoading(false) }
  }

  async function fetchCustomers() {
    try {
      const res = await fetch(buildApiUrl('/customers'), { headers: { accept: '*/*', Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const json = await res.json()
      setCustomers(Array.isArray(json?.data) ? json.data.map((c: any) => ({ id: c.id, name: c.name, phoneNumber: c.phoneNumber })) : [])
    } catch {}
  }
  async function fetchLoanTypes() {
    try {
      const res = await fetch(buildApiUrl('/loan-types'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const json = await res.json()
      setLoanTypes(Array.isArray(json?.data) ? json.data : [])
    } catch {}
  }

  useEffect(() => {
    fetchLoans(); fetchCustomers(); fetchLoanTypes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    const hasErrors = Object.values(formErrors).some(Boolean)
    if (hasErrors) return
    try {
      setLoading(true)
      const endpoint = isEditing ? buildApiUrl(`/loans/${editingId}`) : buildApiUrl('/loans')
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(endpoint, {
        method,
        headers: { accept: '*/*', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message || (isEditing ? 'Failed to update loan' : 'Failed to create loan'))
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ customerId: 0, principal: 0, interest: 0, loanTypeId: 0, startDate: '', status: 'ONGOING' })
      fetchLoans()
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally { setLoading(false) }
  }

  function onEdit(loan: Loan) {
    setShowForm(true)
    setTouched(false)
    setEditingId(loan.id)
    setForm({
      customerId: loan.customerId,
      principal: Number(loan.principal),
      interest: Number(loan.interest),
      loanTypeId: loan.loanTypeId,
      startDate: loan.startDate?.slice(0, 10) || '',
      status: loan.status || 'ONGOING',
    })
  }

  async function onDeactivate(id: number) {
    const ok = window.confirm('Deactivate this loan?')
    if (!ok) return
    try {
      setLoading(true)
      const res = await fetch(buildApiUrl(`/loans/${id}/deactivate`), { method: 'PATCH', headers: { accept: '*/*', Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to deactivate loan')
      fetchLoans()
    } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Loans</h1>
        <Button onClick={() => { setShowForm((v) => !v); setEditingId(null); setForm({ customerId: 0, principal: 0, interest: 0, loanTypeId: 0, startDate: '', status: 'ONGOING' }) }}>{showForm ? 'Cancel' : 'Add Loan'}</Button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit' : 'New'} Loan</h2>
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Customer</label>
              <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" placeholder="Search customer by name or phone" value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} />
              <select className="mt-2 w-full h-9 rounded-md border border-gray-300 px-3" value={form.customerId} onChange={(e) => update('customerId', Number(e.target.value))}>
                <option value={0}>Select customer</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phoneNumber})</option>
                ))}
              </select>
              {formErrors.customerId && <p className="mt-1 text-xs text-red-600">{formErrors.customerId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Loan Type</label>
              <select className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.loanTypeId} onChange={(e) => update('loanTypeId', Number(e.target.value))}>
                <option value={0}>Select type</option>
                {loanTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.collectionType}-{t.collectionPeriod}</option>
                ))}
              </select>
              {formErrors.loanTypeId && <p className="mt-1 text-xs text-red-600">{formErrors.loanTypeId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Principal</label>
              <input type="number" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.principal} onChange={(e) => update('principal', Number(e.target.value))} />
              {formErrors.principal && <p className="mt-1 text-xs text-red-600">{formErrors.principal}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Interest</label>
              <input type="number" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.interest} onChange={(e) => update('interest', Number(e.target.value))} />
              {formErrors.interest && <p className="mt-1 text-xs text-red-600">{formErrors.interest}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input type="date" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
              {formErrors.startDate && <p className="mt-1 text-xs text-red-600">{formErrors.startDate}</p>}
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : isEditing ? 'Update Loan' : 'Create Loan'}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-header border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2">Customer</th>
                <th className="text-left px-4 py-2">Principal</th>
                <th className="text-left px-4 py-2">Interest</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Start</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{l.customerName} <span className="text-gray-500">({l.customerPhone})</span></td>
                  <td className="px-4 py-2">₹ {l.principal}</td>
                  <td className="px-4 py-2">₹ {l.interest}</td>
                  <td className="px-4 py-2">{l.collectionType}-{l.collectionPeriod}</td>
                  <td className="px-4 py-2">{l.startDate?.slice(0,10)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${(l.isActive?.data?.[0] ?? l.isActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button className="mr-2 text-gray-600 hover:text-gray-900" title="Edit" onClick={() => onEdit(l)}>✏️</button>
                    <button className="text-red-600 hover:text-red-700" title="Deactivate" onClick={() => onDeactivate(l.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-600" colSpan={7}>
                    {loading ? 'Loading...' : 'No loans found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default Loans


