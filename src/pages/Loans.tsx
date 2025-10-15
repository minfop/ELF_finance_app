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
  lineTypeId: number
  totalInstallment: number
  totalAmount: number
  balanceAmount: number
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
  lineTypeName: string
  collectionPeriod: number
}

type CustomerOpt = { id: number; name: string; phoneNumber: string }
type LoanTypeOpt = { id: number; collectionType: string; collectionPeriod: number; interest?: number }
type LineTypeOpt = { id: number; name: string; loanTypeId: number; collectionType: string; collectionPeriod: number }

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
  const [lineTypes, setLineTypes] = useState<LineTypeOpt[]>([])
  const [customerQuery, setCustomerQuery] = useState('')

  const [form, setForm] = useState({
    customerId: 0,
    principal: 0,
    interest: 0,
    loanTypeId: 0,
    lineTypeId: 0,
    startDate: '',
    status: 'ONGOING',
    isActive: true,
  })
  const [touched, setTouched] = useState(false)
  const [editInfo, setEditInfo] = useState({ customerName: '', customerPhone: '', disbursedAmount: '', installmentAmount: '' })

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  const formErrors = useMemo(() => ({
    customerId: touched && !form.customerId ? 'Customer is required' : '',
    principal: touched && (!form.principal || form.principal <= 0) ? 'Principal > 0' : '',
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
  async function fetchLineTypes() {
    try {
      const res = await fetch(buildApiUrl('/line-types'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const json = await res.json()
      setLineTypes(Array.isArray(json?.data) ? json.data : [])
    } catch {}
  }

  useEffect(() => {
    fetchLoans(); fetchCustomers(); fetchLoanTypes(); fetchLineTypes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-fill interest and loanTypeId based on selected line type
  useEffect(() => {
    const lt = lineTypes.find((x) => x.id === form.lineTypeId)
    if (!lt) return
    if (form.loanTypeId !== lt.loanTypeId) {
      setForm((s) => ({ ...s, loanTypeId: lt.loanTypeId }))
    }
    const ltType = loanTypes.find((t) => t.id === lt.loanTypeId)
    if (ltType && typeof ltType.interest === 'number') {
      if (form.interest !== ltType.interest) {
        setForm((s) => ({ ...s, interest: ltType.interest as number }))
      }
    }
  }, [form.lineTypeId, lineTypes, loanTypes])

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
      setForm({ customerId: 0, principal: 0, interest: 0, loanTypeId: 0, lineTypeId: 0, startDate: '', status: 'ONGOING', isActive: true })
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
      lineTypeId: loan.lineTypeId,
      startDate: loan.startDate?.slice(0, 10) || '',
      status: loan.status || 'ONGOING',
      isActive: !!(loan.isActive?.data?.[0] ?? loan.isActive),
    })
    setEditInfo({
      customerName: loan.customerName,
      customerPhone: loan.customerPhone,
      disbursedAmount: loan.disbursedAmount,
      installmentAmount: loan.installmentAmount,
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
        <Button onClick={() => { setShowForm((v) => !v); setEditingId(null); setForm({ customerId: 0, principal: 0, interest: 0, loanTypeId: 0, lineTypeId: 0, startDate: '', status: 'ONGOING', isActive: true }) }}>{showForm ? 'Cancel' : 'Add Loan'}</Button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit' : 'New'} Loan</h2>
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isEditing ? (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <div className="mt-1 h-9 flex items-center rounded-md border border-gray-300 px-3 bg-gray-50 text-gray-700">
                    {editInfo.customerName} ({editInfo.customerPhone})
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Loan Type</label>
                  <select disabled className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3 bg-gray-50 text-gray-700" value={form.loanTypeId}>
                    <option value={0}>Select type</option>
                    {loanTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.collectionType}-{t.collectionPeriod}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
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
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700">Loan Type</label>
                  <select className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.loanTypeId} onChange={(e) => update('loanTypeId', Number(e.target.value))}>
                    <option value={0}>Select type</option>
                    {loanTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.collectionType}-{t.collectionPeriod}</option>
                    ))}
                  </select>
                  {formErrors.loanTypeId && <p className="mt-1 text-xs text-red-600">{formErrors.loanTypeId}</p>}
                </div> */}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Line Type</label>
              <select className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.lineTypeId} onChange={(e) => update('lineTypeId', Number(e.target.value))}>
                <option value={0}>Select line</option>
                {lineTypes
                  // .filter((lt) => !form.loanTypeId || lt.loanTypeId === form.loanTypeId)
                  .map((lt) => (
                    <option key={lt.id} value={lt.id}>{lt.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Principal</label>
              <input type="number" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.principal} onChange={(e) => update('principal', Number(e.target.value))} />
              {formErrors.principal && <p className="mt-1 text-xs text-red-600">{formErrors.principal}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Interest %</label>
              <input type="number" disabled className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3 bg-gray-50 text-gray-700" value={form.interest} onChange={(e) => update('interest', Number(e.target.value))} />
            </div>

            {isEditing && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Disbursed Amount</label>
                  <input disabled className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3 bg-gray-50 text-gray-700" value={editInfo.disbursedAmount} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Installment Amount</label>
                  <input disabled className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3 bg-gray-50 text-gray-700" value={editInfo.installmentAmount} />
                </div>
                <div className="flex items-center gap-2 mt-7">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => update('isActive', e.target.checked)} />
                  <span className="text-sm text-gray-700">Active</span>
                </div>
              </>
            )}

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

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-header border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2">Customer</th>
                <th className="text-left px-4 py-2">Principal</th>
                <th className="text-left px-4 py-2">Interest</th>
                <th className="text-left px-4 py-2">DisbursedAmount</th>
                <th className="text-left px-4 py-2">TotalAmount</th>
                <th className="text-left px-4 py-2">BalanceAmount</th>
                {/* <th className="text-left px-4 py-2">Type</th> */}
                <th className="text-left px-4 py-2">Line Name</th>
                <th className="text-left px-4 py-2">Start</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{l.customerName} <span className="text-gray-500">(<a href={`tel:${l.customerPhone}`} className="text-primary hover:underline">{l.customerPhone}</a>)</span></td>
                  <td className="px-4 py-2">₹ {l.principal}</td>
                  <td className="px-4 py-2">₹ {l.interest}</td>
                  <td className="px-4 py-2">₹ {l.disbursedAmount}</td>
                  <td className="px-4 py-2">₹ {l.totalAmount}</td>
                  <td className="px-4 py-2">₹ {l.balanceAmount}</td>
                  {/* <td className="px-4 py-2">{l.collectionType}-{l.collectionPeriod}</td> */}
                  <td className="px-4 py-2">
                    <p>{l.lineTypeName}</p>
                    <p>({l.collectionType}-{l.collectionPeriod})</p>
                    </td>
                  <td className="px-4 py-2">{l.startDate?.slice(0,10)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${(l.isActive?.data?.[0] ?? l.isActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button className="mr-2 text-gray-600 hover:text-gray-900" title="Edit" onClick={() => onEdit(l)}>✏️</button>
                    <a className="mr-2 text-primary hover:underline" href={`/loans/${l.id}/installments`}>Paid</a>
                    <button className="mr-2 text-amber-600 hover:text-amber-700" title="Mark Missed" onClick={async () => {
                      const ok = window.confirm('Mark this installment missed for today?')
                      if (!ok) return
                      try {
                        setLoading(true)
                        const res = await fetch(buildApiUrl('/installments/missed'), { method: 'POST', headers: { accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ loanId: l.id }) })
                        if (!res.ok) throw new Error('Failed to mark missed')
                        fetchLoans()
                      } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
                    }}>Missed</button>
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
      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loans.map((l) => (
          <div key={l.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900">{l.customerName} <span className="text-gray-500">(<a href={`tel:${l.customerPhone}`} className="text-primary hover:underline">{l.customerPhone}</a>)</span></div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${(l.isActive?.data?.[0] ?? l.isActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                {l.status}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-700">
              <div>Principal: ₹ {l.principal}</div>
              <div>Interest: ₹ {l.interest}</div>
              <div>Disbursed: ₹ {l.disbursedAmount}</div>
              <div>Installment: ₹ {l.installmentAmount}</div>
              <div>Type: {l.collectionType}-{l.collectionPeriod}</div>
              <div>Line: {l.lineTypeName}</div>
              <div>Start: {l.startDate?.slice(0,10)}</div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-3">
              <a className="text-primary hover:underline" href={`/loans/${l.id}/installments`}>Paid</a>
              <button className="text-amber-600 hover:text-amber-700" title="Mark Missed" onClick={async () => {
                const ok = window.confirm('Mark this installment missed for today?')
                if (!ok) return
                try {
                  setLoading(true)
                  const res = await fetch(buildApiUrl('/installments/missed'), { method: 'POST', headers: { accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ loanId: l.id }) })
                  if (!res.ok) throw new Error('Failed to mark missed')
                  fetchLoans()
                } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
              }}>Missed</button>
              <button className="text-gray-600 hover:text-gray-900" title="Edit" onClick={() => onEdit(l)}>✏️</button>
              <button className="text-red-600 hover:text-red-700" title="Deactivate" onClick={() => onDeactivate(l.id)}>🗑️</button>
            </div>
          </div>
        ))}
        {loans.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">
            {loading ? 'Loading...' : 'No loans found.'}
          </div>
        )}
      </div>
    </section>
  )
}

export default Loans


