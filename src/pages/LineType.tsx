import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Button from '../components/Button'
import { buildApiUrl } from '../utils/api'

type LineType = {
  id: number
  name: string
  loanTypeId: number
  isActive: any
  accessUsersId: string
  collectionType: string
  collectionPeriod: number
}

type LoanTypeOpt = { id: number; collectionType: string; collectionPeriod: number }
type UserOpt = { id: number; name: string }

function LineTypePage() {
  const token = useSelector((s: RootState) => s.auth.authToken)
  const [items, setItems] = useState<LineType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const isEditing = editingId !== null

  const [loanTypes, setLoanTypes] = useState<LoanTypeOpt[]>([])
  const [users, setUsers] = useState<UserOpt[]>([])

  const [form, setForm] = useState({ name: '', loanTypeId: 0, isActive: true, accessUsersId: [] as number[] })
  const [touched, setTouched] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  const formErrors = useMemo(() => ({
    name: touched && !form.name ? 'Name is required' : '',
    loanTypeId: touched && !form.loanTypeId ? 'Loan type is required' : '',
    accessUsersId: touched && form.accessUsersId.length === 0 ? 'Select at least one user' : '',
  }), [form, touched])

  async function fetchList() {
    try {
      setLoading(true)
      setError(undefined)
      const res = await fetch(buildApiUrl('/line-types'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load line types')
      const json = await res.json()
      setItems(Array.isArray(json?.data) ? json.data : [])
    } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
  }

  async function fetchLoanTypes() {
    try {
      const res = await fetch(buildApiUrl('/loan-types'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const json = await res.json()
      setLoanTypes(Array.isArray(json?.data) ? json.data : [])
    } catch {}
  }
  async function fetchUsers() {
    try {
      const res = await fetch(buildApiUrl('/users'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const json = await res.json()
      setUsers(Array.isArray(json?.data) ? json.data.map((u: any) => ({ id: u.id, name: u.name })) : [])
    } catch {}
  }

  useEffect(() => {
    fetchList(); fetchLoanTypes(); fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toCsv(ids: number[]) { return ids.join(',') }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    const hasErrors = Object.values(formErrors).some(Boolean)
    if (hasErrors) return
    try {
      setLoading(true)
      const endpoint = isEditing ? buildApiUrl(`/line-types/${editingId}`) : buildApiUrl('/line-types')
      const method = isEditing ? 'PUT' : 'POST'
      const payload = { name: form.name, loanTypeId: form.loanTypeId, isActive: form.isActive, accessUsersId: toCsv(form.accessUsersId) }
      const res = await fetch(endpoint, { method, headers: { accept: '*/*', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message || (isEditing ? 'Failed to update' : 'Failed to create'))
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ name: '', loanTypeId: 0, isActive: true, accessUsersId: [] })
      fetchList()
    } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
  }

  function onEdit(item: LineType) {
    setShowForm(true)
    setTouched(false)
    setEditingId(item.id)
    setForm({
      name: item.name || '',
      loanTypeId: item.loanTypeId || 0,
      isActive: !!(item.isActive?.data?.[0] ?? item.isActive),
      accessUsersId: String(item.accessUsersId || '')
        .split(',')
        .map((s) => Number(s.trim()))
        .filter(Boolean),
    })
  }

  async function onDeactivate(id: number) {
    const ok = window.confirm('Deactivate this line type?')
    if (!ok) return
    try {
      setLoading(true)
      const res = await fetch(buildApiUrl(`/line-types/${id}/deactivate`), { method: 'PATCH', headers: { accept: '*/*', Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to deactivate')
      fetchList()
    } catch (e: any) { setError(e?.message || 'Request failed') } finally { setLoading(false) }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Line Types</h1>
        <Button onClick={() => { setShowForm((v) => !v); setEditingId(null); setForm({ name: '', loanTypeId: 0, isActive: true, accessUsersId: [] }) }}>{showForm ? 'Cancel' : 'Add Line Type'}</Button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit' : 'New'} Line Type</h2>
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.name} onChange={(e) => update('name', e.target.value)} />
              {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
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
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Access Users</label>
              <select multiple className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 h-36" value={form.accessUsersId.map(String)} onChange={(e) => {
                const values = Array.from(e.target.selectedOptions).map((o) => Number(o.value))
                update('accessUsersId', values)
              }}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              {formErrors.accessUsersId && <p className="mt-1 text-xs text-red-600">{formErrors.accessUsersId}</p>}
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => update('isActive', e.target.checked)} />
              <span className="text-sm text-gray-700">Active</span>
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : isEditing ? 'Update Line Type' : 'Create Line Type'}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-header border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Loan Type</th>
                <th className="text-left px-4 py-2">Access Users</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{it.name}</td>
                  <td className="px-4 py-2">{it.collectionType}-{it.collectionPeriod}</td>
                  <td className="px-4 py-2">{String(it.accessUsersId)}</td>
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
                    {loading ? 'Loading...' : 'No line types found.'}
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

export default LineTypePage


