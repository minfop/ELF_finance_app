import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Button from '../components/Button'
import { buildApiUrl } from '../utils/api'

type Expense = {
  id: number
  expenseId: number
  userId: number
  lineTypeId: number
  amount: string
  isActive: any
  createdAt: string
  expenseName: string
  maxLimit?: string
  accessUsersId?: string
  userName?: string
  lineTypeName?: string
}

type ExpenseTypeOpt = { id: number; name: string }
type LineTypeOpt = { id: number; name: string }

function Expenses() {
  const token = useSelector((s: RootState) => s.auth.authToken)
  const [items, setItems] = useState<Expense[]>([])
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeOpt[]>([])
  const [lineTypes, setLineTypes] = useState<LineTypeOpt[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const isEditing = editingId !== null
  const [form, setForm] = useState({ expenseId: 0, amount: 0, isActive: true, lineTypeId: 0 })
  const [touched, setTouched] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  const formErrors = useMemo(() => ({
    expenseId: touched && !form.expenseId ? 'Expense type is required' : '',
    amount: touched && form.amount <= 0 ? 'Amount > 0' : '',
    lineTypeId: touched && !form.lineTypeId ? 'Line type is required' : '',
  }), [form, touched])

  async function fetchList() {
    try {
      setLoading(true)
      setError(undefined)
      const res = await fetch(buildApiUrl('/expenses'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load expenses')
      const j = await res.json()
      setItems(Array.isArray(j?.data) ? j.data : [])
    } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
  }

  async function fetchExpenseTypes() {
    try {
      const res = await fetch(buildApiUrl('/expenses-types'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const j = await res.json()
      const arr = Array.isArray(j?.data) ? j.data : []
      setExpenseTypes(arr.map((x: any) => ({ id: x.id, name: x.name })))
    } catch {}
  }

  async function fetchLineTypes() {
    try {
      const res = await fetch(buildApiUrl('line-types/by-user'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const j = await res.json()
      const arr = Array.isArray(j?.data) ? j.data : []
      setLineTypes(arr.map((x: any) => ({ id: x.id, name: x.name })))
    } catch {}
  }

  useEffect(() => { fetchList(); fetchExpenseTypes(); fetchLineTypes() }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (Object.values(formErrors).some(Boolean)) return
    try {
      setLoading(true)
      const endpoint = isEditing ? buildApiUrl(`/expenses/${editingId}`) : buildApiUrl('/expenses')
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(endpoint, {
        method,
        headers: { accept: '*/*', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.message || (isEditing ? 'Failed to update' : 'Failed to create'))
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ expenseId: 0, amount: 0, isActive: true, lineTypeId: 0 })
      fetchList()
    } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
  }

  function onEdit(it: Expense) {
    setShowForm(true)
    setTouched(false)
    setEditingId(it.id)
    setForm({ expenseId: it.expenseId, amount: Number(it.amount || 0), isActive: !!(it.isActive?.data?.[0] ?? it.isActive), lineTypeId: it.lineTypeId })
  }

  async function onDeactivate(id: number) {
    const ok = window.confirm('Deactivate this expense?')
    if (!ok) return
    try {
      setLoading(true)
      const res = await fetch(buildApiUrl(`/expenses/${id}/deactivate`), { method: 'PATCH', headers: { accept: '*/*', Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to deactivate')
      fetchList()
    } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <Button onClick={() => { setShowForm((v) => !v); setEditingId(null); setForm({ expenseId: 0, amount: 0, isActive: true, lineTypeId: 0 }) }}>{showForm ? 'Cancel' : 'Add Expense'}</Button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit' : 'New'} Expense</h2>
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Expense Type</label>
              <select className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.expenseId} onChange={(e) => update('expenseId', Number(e.target.value))}>
                <option value={0}>Select type</option>
                {expenseTypes.map((et) => (
                  <option key={et.id} value={et.id}>{et.name}</option>
                ))}
              </select>
              {formErrors.expenseId && <p className="mt-1 text-xs text-red-600">{formErrors.expenseId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Line Type</label>
              <select className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.lineTypeId} onChange={(e) => update('lineTypeId', Number(e.target.value))}>
                <option value={0}>Select line</option>
                {lineTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>{lt.name}</option>
                ))}
              </select>
              {formErrors.lineTypeId && <p className="mt-1 text-xs text-red-600">{formErrors.lineTypeId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input type="number" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.amount} onChange={(e) => update('amount', Number(e.target.value))} />
              {formErrors.amount && <p className="mt-1 text-xs text-red-600">{formErrors.amount}</p>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" checked={form.isActive} onChange={(e) => update('isActive', e.target.checked)} />
              <span className="text-sm text-gray-700">Active</span>
            </div>
            <div className="md:col-span-4">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : isEditing ? 'Update Expense' : 'Create Expense'}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-header border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2">Expense</th>
                <th className="text-left px-4 py-2">User</th>
                <th className="text-left px-4 py-2">Line Type</th>
                <th className="text-left px-4 py-2">Amount</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{it.expenseName}</td>
                  <td className="px-4 py-2">{it.userName}</td>
                  <td className="px-4 py-2">{it.lineTypeName}</td>
                  <td className="px-4 py-2">₹ {it.amount}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${(it.isActive?.data?.[0] ?? it.isActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {(it.isActive?.data?.[0] ?? it.isActive) ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button className="mr-2 text-gray-600 hover:text-gray-900" title="Edit" onClick={() => onEdit(it)}>✏️</button>
                    <button className="text-red-600 hover:text-red-700" title="Deactivate" onClick={() => onDeactivate(it.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-600" colSpan={6}>
                    {loading ? 'Loading...' : 'No expenses found.'}
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
              <div className="font-semibold text-gray-900">{it.expenseName}</div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${(it.isActive?.data?.[0] ?? it.isActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                {(it.isActive?.data?.[0] ?? it.isActive) ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-700">
              <div>User: {it.userName}</div>
              <div>Line: {it.lineTypeName}</div>
              <div>Amount: ₹ {it.amount}</div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-3">
              <button className="text-gray-600 hover:text-gray-900" title="Edit" onClick={() => onEdit(it)}>✏️</button>
              <button className="text-red-600 hover:text-red-700" title="Deactivate" onClick={() => onDeactivate(it.id)}>🗑️</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">{loading ? 'Loading...' : 'No expenses found.'}</div>
        )}
      </div>
    </section>
  )
}

export default Expenses


