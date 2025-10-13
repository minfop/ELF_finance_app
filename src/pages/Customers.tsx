import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Button from '../components/Button'
import { buildApiUrl } from '../utils/api'

type Customer = {
  id: number
  tenantId: number
  name: string
  phoneNumber: string
  email: string
  photo?: string
  documents?: string
  isActive: any
  createdAt: string
  tenantName: string
}

function Customers() {
  const token = useSelector((s: RootState) => s.auth.authToken)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '+91',
    email: '',
    photo: '',
    documents: '',
    isActive: true,
  })
  const [touched, setTouched] = useState(false)
  const isEditing = editingId !== null

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function isValidIntlPhone(v: string) {
    return /^\+[0-9]{10,15}$/.test(v)
  }
  function isValidEmail(v: string) {
    return /.+@.+\..+/.test(v)
  }
  function isValidJsonOrEmpty(v: string) {
    if (!v) return true
    try { JSON.parse(v); return true } catch { return false }
  }

  const formErrors = useMemo(() => ({
    name: touched && !form.name ? 'Name is required' : '',
    phoneNumber: touched && !isValidIntlPhone(form.phoneNumber) ? 'Use international format, e.g. +919999999999' : '',
    email: touched && !isValidEmail(form.email) ? 'Valid email required' : '',
    documents: touched && !isValidJsonOrEmpty(form.documents) ? 'Documents must be valid JSON' : '',
  }), [form, touched])

  async function fetchCustomers() {
    try {
      setLoading(true)
      setError(undefined)
      const res = await fetch(buildApiUrl('/customers'), {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to load customers')
      const json = await res.json()
      setCustomers(Array.isArray(json?.data) ? json.data : [])
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    const hasErrors = Object.values(formErrors).some(Boolean)
    if (hasErrors) return
    try {
      setLoading(true)
      const endpoint = isEditing ? buildApiUrl(`/customers/${editingId}`) : buildApiUrl('/customers')
      const method = isEditing ? 'PUT' : 'POST'
      const body = isEditing
        ? JSON.stringify({
            name: form.name,
            phoneNumber: form.phoneNumber,
            email: form.email,
            photo: form.photo || undefined,
            documents: form.documents || undefined,
            isActive: form.isActive,
          })
        : JSON.stringify(form)
      const res = await fetch(endpoint, {
        method,
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body,
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message || (isEditing ? 'Failed to update customer' : 'Failed to create customer'))
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ name: '', phoneNumber: '+91', email: '', photo: '', documents: '', isActive: true })
      fetchCustomers()
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  function onEdit(c: Customer) {
    setShowForm(true)
    setTouched(false)
    setEditingId(c.id)
    setForm({
      name: c.name || '',
      phoneNumber: c.phoneNumber || '+91',
      email: c.email || '',
      photo: c.photo || '',
      documents: c.documents || '',
      isActive: !!(c.isActive?.data?.[0] ?? c.isActive),
    })
  }

  async function onDeactivate(id: number) {
    const ok = window.confirm('Deactivate this customer?')
    if (!ok) return
    try {
      setLoading(true)
      const res = await fetch(buildApiUrl(`/customers/${id}/deactivate`), {
        method: 'PATCH',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to deactivate customer')
      fetchCustomers()
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Customer Management</h1>
        <Button onClick={() => { setShowForm((v) => !v); setEditingId(null); setForm({ name: '', phoneNumber: '+91', email: '', photo: '', documents: '', isActive: true }); }}>{showForm ? 'Cancel' : 'Add Customer'}</Button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit' : 'New'} Customer</h2>
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.name} onChange={(e) => update('name', e.target.value)} />
              {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
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
              <label className="block text-sm font-medium text-gray-700">Photo</label>
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) update('photo', await readFileAsDataURL(file))
                }}
              />
              {form.photo && form.photo.startsWith('data:image') && (
                <div className="mt-2">
                  <img src={form.photo} alt="preview" className="w-16 h-16 rounded-md object-cover border" />
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Documents</label>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || [])
                  if (files.length === 0) return
                  const entries = await Promise.all(files.map(async (f) => [f.name, await readFileAsDataURL(f)] as const))
                  update('documents', JSON.stringify(Object.fromEntries(entries)))
                }}
              />
              {form.documents && (
                <p className="mt-1 text-xs text-gray-600">
                  {(() => { try { return Object.keys(JSON.parse(form.documents)).length } catch { return 0 } })()} file(s) attached
                </p>
              )}
              {formErrors.documents && <p className="mt-1 text-xs text-red-600">{formErrors.documents}</p>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" checked={form.isActive} onChange={(e) => update('isActive', e.target.checked)} />
              <span className="text-sm text-gray-700">Active</span>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : isEditing ? 'Update Customer' : 'Create Customer'}</Button>
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
                <th className="text-left px-4 py-2">Phone</th>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2 flex items-center gap-2">
                    {c.photo && c.photo.startsWith('data:image') && (
                      <img src={c.photo} alt="avatar" className="w-8 h-8 rounded-full object-cover border" />
                    )}
                    <span>{c.name}</span>
                  </td>
                  <td className="px-4 py-2">{c.phoneNumber}</td>
                  <td className="px-4 py-2">{c.email}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${(c.isActive?.data?.[0] ?? c.isActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {(c.isActive?.data?.[0] ?? c.isActive) ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button className="mr-2 text-gray-600 hover:text-gray-900" title="Edit" onClick={() => onEdit(c)}>✏️</button>
                    <button className="text-red-600 hover:text-red-700" title="Deactivate" onClick={() => onDeactivate(c.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-600" colSpan={5}>
                    {loading ? 'Loading...' : 'No customers found.'}
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

export default Customers


