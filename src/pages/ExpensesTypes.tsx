import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Button from '../components/Button'
import { buildApiUrl } from '../utils/api'

type ExpenseType = {
  id: number
  name: string
  maxLimit: string
  isActive: any
  accessUsersId?: string
}

type UserOpt = { id: number; name: string }

function ExpensesTypes() {
  const token = useSelector((s: RootState) => s.auth.authToken)
  const [items, setItems] = useState<ExpenseType[]>([])
  const [users, setUsers] = useState<UserOpt[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const isEditing = editingId !== null
  const [form, setForm] = useState({ name: '', maxLimit: 0, isActive: true, accessUsersId: [] as number[] })
  const [touched, setTouched] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  const formErrors = useMemo(() => ({
    name: touched && !form.name ? 'Name is required' : '',
    maxLimit: touched && (form.maxLimit as number) <= 0 ? 'Max limit > 0' : '',
  }), [form, touched])

  async function fetchList() {
    try {
      setLoading(true)
      setError(undefined)
      const res = await fetch(buildApiUrl('/expenses-types'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load expense types')
      const j = await res.json()
      setItems(Array.isArray(j?.data) ? j.data : [])
    } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
  }

  async function fetchUsers() {
    try {
      const res = await fetch(buildApiUrl('/users/my-tenant'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const j = await res.json()
      const arr = Array.isArray(j?.data) ? j.data : []
      setUsers(arr.map((u: any) => ({ id: u.id, name: u.name })))
    } catch {}
  }

  useEffect(() => { fetchList(); fetchUsers() }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (Object.values(formErrors).some(Boolean)) return
    try {
      setLoading(true)
      const endpoint = isEditing ? buildApiUrl(`/expenses-types/${editingId}`) : buildApiUrl('/expenses-types')
      const method = isEditing ? 'PUT' : 'POST'
      const payload = {
        name: form.name,
        isActive: form.isActive,
        maxLimit: form.maxLimit,
        accessUsersId: form.accessUsersId.join(','),
      }
      const res = await fetch(endpoint, {
        method,
        headers: { accept: '*/*', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.message || (isEditing ? 'Failed to update' : 'Failed to create'))
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ name: '', maxLimit: 0, isActive: true, accessUsersId: [] })
      fetchList()
    } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
  }

  function onEdit(it: ExpenseType) {
    setShowForm(true)
    setTouched(false)
    setEditingId(it.id)
    const ids = String(it.accessUsersId || '').split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n))
    setForm({ name: it.name || '', maxLimit: Number(it.maxLimit || 0), isActive: !!(it.isActive?.data?.[0] ?? it.isActive), accessUsersId: ids })
  }

  async function onDeactivate(id: number) {
    const ok = window.confirm('Deactivate this expense type?')
    if (!ok) return
    try {
      setLoading(true)
      const res = await fetch(buildApiUrl(`/expenses-types/${id}/deactivate`), { method: 'PATCH', headers: { accept: '*/*', Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to deactivate')
      fetchList()
    } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Expenses Management</h1>
        <Button onClick={() => { setShowForm((v) => !v); setEditingId(null); setForm({ name: '', maxLimit: 0, isActive: true, accessUsersId: [] }) }}>{showForm ? 'Cancel' : 'Add Type'}</Button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit' : 'New'} Expense Type</h2>
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.name} onChange={(e) => update('name', e.target.value)} />
              {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Limit</label>
              <input type="number" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.maxLimit} onChange={(e) => update('maxLimit', Number(e.target.value))} />
              {formErrors.maxLimit && <p className="mt-1 text-xs text-red-600">{formErrors.maxLimit}</p>}
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Access Users</label>
              <select multiple className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 h-36" value={form.accessUsersId.map(String)} onChange={(e) => {
                const values = Array.from(e.target.selectedOptions).map((o) => Number(o.value))
                update('accessUsersId', values as any)
              }}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" checked={form.isActive} onChange={(e) => update('isActive', e.target.checked)} />
              <span className="text-sm text-gray-700">Active</span>
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : isEditing ? 'Update Type' : 'Create Type'}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-header border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Max Limit</th>
                <th className="text-left px-4 py-2">Access Users</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{it.name}</td>
                  <td className="px-4 py-2">₹ {it.maxLimit}</td>
                  <td className="px-4 py-2">{it.accessUsersId}</td>
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
                  <td className="px-4 py-8 text-center text-gray-600" colSpan={5}>
                    {loading ? 'Loading...' : 'No expense types found.'}
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
              <div className="font-semibold text-gray-900">{it.name}</div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${(it.isActive?.data?.[0] ?? it.isActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                {(it.isActive?.data?.[0] ?? it.isActive) ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-2 text-sm text-gray-700">Max Limit: ₹ {it.maxLimit}</div>
            <div className="text-xs text-gray-600">Access: {it.accessUsersId || '-'}</div>
            <div className="mt-3 flex items-center justify-end gap-3">
              <button className="text-gray-600 hover:text-gray-900" title="Edit" onClick={() => onEdit(it)}>✏️</button>
              <button className="text-red-600 hover:text-red-700" title="Deactivate" onClick={() => onDeactivate(it.id)}>🗑️</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">{loading ? 'Loading...' : 'No expense types found.'}</div>
        )}
      </div>
    </section>
  )
}

export default ExpensesTypes


