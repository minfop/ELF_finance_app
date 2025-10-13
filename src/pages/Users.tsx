import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Button from '../components/Button'
import { buildApiUrl } from '../utils/api'

type TenantUser = {
  id: number
  tenantId: number
  name: string
  roleId: number
  phoneNumber: string
  email: string
  isActive: any
  createdAt: string
  tenantName: string
  roleName: string
}

const ROLE_OPTIONS: { id: number; label: string }[] = [
  { id: 1, label: 'admin' },
  { id: 3, label: 'manager' },
  { id: 4, label: 'collectioner' },
]

function Users() {
  const token = useSelector((s: RootState) => s.auth.authToken)
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '',
    roleId: 4,
    phoneNumber: '+91',
    email: '',
    password: '',
    isActive: true,
  })
  const [touched, setTouched] = useState(false)
  const isEditing = editingId !== null

  function isValidIntlPhone(v: string) {
    return /^\+[0-9]{10,15}$/.test(v)
  }
  function isValidEmail(v: string) {
    return /.+@.+\..+/.test(v)
  }

  const formErrors = useMemo(() => ({
    name: touched && !form.name ? 'Name is required' : '',
    roleId: touched && !form.roleId ? 'Role is required' : '',
    phoneNumber: touched && !isValidIntlPhone(form.phoneNumber) ? 'Use international format, e.g. +919999999999' : '',
    email: touched && !isValidEmail(form.email) ? 'Valid email required' : '',
    password: touched && !isEditing && form.password.length < 6 ? 'Password must be 6+ characters' : '',
  }), [form, touched, isEditing])

  async function fetchUsers() {
    try {
      setLoading(true)
      setError(undefined)
      const res = await fetch(buildApiUrl('/users/my-tenant'), {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to load users')
      const json = await res.json()
      setUsers(Array.isArray(json?.data) ? json.data : [])
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    const hasErrors = Object.values(formErrors).some(Boolean)
    if (hasErrors) return
    try {
      setLoading(true)
      const endpoint = isEditing ? buildApiUrl(`/users/${editingId}`) : buildApiUrl('/users')
      const method = isEditing ? 'PUT' : 'POST'
      const body = isEditing
        ? JSON.stringify({ name: form.name, roleId: form.roleId, phoneNumber: form.phoneNumber, email: form.email, isActive: form.isActive })
        : JSON.stringify(form)
      const res = await fetch(endpoint, {
        method,
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body,
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message || (isEditing ? 'Failed to update user' : 'Failed to create user'))
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ name: '', roleId: 4, phoneNumber: '+91', email: '', password: '', isActive: true })
      fetchUsers()
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  function onEdit(u: TenantUser) {
    setShowForm(true)
    setTouched(false)
    setEditingId(u.id)
    setForm({
      name: u.name || '',
      roleId: u.roleId || 4,
      phoneNumber: u.phoneNumber || '+91',
      email: u.email || '',
      password: '',
      isActive: !!(u.isActive?.data?.[0]),
    })
  }

  async function onDeactivate(id: number) {
    const ok = window.confirm('Deactivate this user?')
    if (!ok) return
    try {
      setLoading(true)
      const res = await fetch(buildApiUrl(`/users/${id}/deactivate`), {
        method: 'PATCH',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to deactivate user')
      fetchUsers()
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">User Management</h1>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'Add User'}</Button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">New User</h2>
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.name} onChange={(e) => update('name', e.target.value)} />
              {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.roleId} onChange={(e) => update('roleId', Number(e.target.value))}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              {formErrors.roleId && <p className="mt-1 text-xs text-red-600">{formErrors.roleId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} placeholder="+919999999999" />
              {formErrors.phoneNumber && <p className="mt-1 text-xs text-red-600">{formErrors.phoneNumber}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="user@company.com" />
              {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.password} onChange={(e) => update('password', e.target.value)} />
              {formErrors.password && <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>}
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" checked={form.isActive} onChange={(e) => update('isActive', e.target.checked)} />
              <span className="text-sm text-gray-700">Active user</span>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : isEditing ? 'Update User' : 'Create user'}</Button>
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
                <th className="text-left px-4 py-2">Role</th>
                <th className="text-left px-4 py-2">Phone</th>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2 capitalize">{u.roleName}</td>
                  <td className="px-4 py-2">{u.phoneNumber}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive?.data?.[0] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {u.isActive?.data?.[0] ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button className="mr-2 text-gray-600 hover:text-gray-900" title="Edit" onClick={() => onEdit(u)}>✏️</button>
                    <button className="text-red-600 hover:text-red-700" title="Delete" onClick={() => onDeactivate(u.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-600" colSpan={6}>
                    {loading ? 'Loading users...' : 'No users found.'}
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

export default Users


