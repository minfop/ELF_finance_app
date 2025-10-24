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
  longitude?: number
  latitude?: number
  place?: string
  identifyNumber?: string
  addidtionalMobile?: string
  address?: string
  referenceById?: number
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
    addidtionalMobile: '',
    identifyNumber: '',
    place: '',
    address: '',
    latitude: '' as unknown as number | null,
    longitude: '' as unknown as number | null,
    referenceById: '' as unknown as number | null,
    isActive: true,
  })
  const [touched, setTouched] = useState(false)
  const isEditing = editingId !== null
  const [locationError, setLocationError] = useState<string | undefined>()

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

  const docEntries = useMemo(() => {
    try {
      const obj = form.documents ? JSON.parse(form.documents) as Record<string, string> : {}
      return Object.entries(obj) as [string, string][]
    } catch {
      return [] as [string, string][]
    }
  }, [form.documents])

  function useMyLocation() {
    setLocationError(undefined)
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation not supported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update('latitude', pos.coords.latitude as any)
        update('longitude', pos.coords.longitude as any)
      },
      (err) => {
        setLocationError(err.message || 'Unable to get location')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
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
      const payload: any = {
        name: form.name,
        phoneNumber: form.phoneNumber,
        email: form.email,
        photo: form.photo || undefined,
        documents: form.documents || undefined,
        isActive: form.isActive,
      }
      if (form.addidtionalMobile) payload.addidtionalMobile = form.addidtionalMobile
      if (form.identifyNumber) payload.identifyNumber = form.identifyNumber
      if (form.place) payload.place = form.place
      if (form.address) payload.address = form.address
      if (form.latitude !== null && form.latitude !== ('' as any)) payload.latitude = Number(form.latitude)
      if (form.longitude !== null && form.longitude !== ('' as any)) payload.longitude = Number(form.longitude)
      if (form.referenceById !== null && form.referenceById !== ('' as any)) payload.referenceById = Number(form.referenceById)

      const body = JSON.stringify(payload)
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
      setForm({ name: '', phoneNumber: '+91', email: '', photo: '', documents: '', addidtionalMobile: '', identifyNumber: '', place: '', address: '', latitude: '' as any, longitude: '' as any, referenceById: '' as any, isActive: true })
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
      addidtionalMobile: c.addidtionalMobile || '',
      identifyNumber: c.identifyNumber || '',
      place: c.place || '',
      address: c.address || '',
      latitude: (c.latitude !== undefined && c.latitude !== null && !Number.isNaN(Number((c as any).latitude))) ? Number((c as any).latitude) : ('' as any),
      longitude: (c.longitude !== undefined && c.longitude !== null && !Number.isNaN(Number((c as any).longitude))) ? Number((c as any).longitude) : ('' as any),
      referenceById: (c.referenceById as number) ?? ('' as any),
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
        <Button onClick={() => { setShowForm((v) => !v); setEditingId(null); setForm({ name: '', phoneNumber: '+91', email: '', photo: '', documents: '', isActive: true, addidtionalMobile: '', address: '', identifyNumber: '', latitude: 0,longitude: 0, place: '',referenceById: 0 }); }}>{showForm ? 'Cancel' : 'Add Customer'}</Button>
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
            <label className="block text-sm font-medium text-gray-700">Additional Mobile</label>
            <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.addidtionalMobile} onChange={(e) => update('addidtionalMobile', e.target.value)} placeholder="+919999999999" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Identify Number</label>
            <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.identifyNumber} onChange={(e) => update('identifyNumber', e.target.value)} placeholder="123456789V" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Place</label>
            <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.place} onChange={(e) => update('place', e.target.value)} placeholder="Colombo" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" rows={3} value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="123 Main Street, Colombo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Latitude</label>
            <input type="number" disabled step="0.00000001" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={(form.latitude as any) || ''} onChange={(e) => update('latitude', (e.target.value === '' ? ('' as any) : Number(e.target.value)))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Longitude</label>
            <input type="number" disabled step="0.00000001" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={(form.longitude as any) || ''} onChange={(e) => update('longitude', (e.target.value === '' ? ('' as any) : Number(e.target.value)))} />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={useMyLocation}>Get Location</Button>
          </div>
          {locationError && <div className="md:col-span-2 text-xs text-red-600">{locationError}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700">Reference By (Customer)</label>
            <select
              className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3"
              value={(form.referenceById as any) || ''}
              onChange={(e) => update('referenceById', (e.target.value === '' ? ('' as any) : Number(e.target.value)))}
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
            {docEntries.length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {docEntries.map(([name, data]) => (
                  <div key={name} className="border border-gray-200 rounded-md p-2 text-xs text-gray-700">
                    {String(data).startsWith('data:image') ? (
                      <img src={data} alt={name} className="w-full h-24 object-cover rounded" />
                    ) : (
                      <a href={data} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{name}</a>
                    )}
                  </div>
                ))}
              </div>
            )}
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

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden hidden md:block">
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
                  <td className="px-4 py-2"><a href={`tel:${c.phoneNumber}`} className="text-primary hover:underline">{c.phoneNumber}</a></td>
                  <td className="px-4 py-2">{c.email}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${(c.isActive?.data?.[0] ?? c.isActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {(c.isActive?.data?.[0] ?? c.isActive) ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {((c.latitude != null  && !Number.isNaN(Number((c as any).latitude))) && (c.latitude != null  && !Number.isNaN(Number((c as any).longitude)))) && (
                      <a className="mr-2 text-primary hover:underline" href={`https://www.google.com/maps?q=${(c as any).latitude},${(c as any).longitude}`} target="_blank" rel="noreferrer">Navigate</a>
                    )}
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

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {customers.map((c) => (
          <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              {c.photo && c.photo.startsWith('data:image') && (
                <img src={c.photo} alt="avatar" className="w-10 h-10 rounded-full object-cover border" />
              )}
              <div>
                <div className="font-semibold text-gray-900">{c.name}</div>
                <div className="text-sm text-gray-600">{c.email}</div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-700">Phone: <a href={`tel:${c.phoneNumber}`} className="text-primary hover:underline">{c.phoneNumber}</a></div>
            {(c as any).addidtionalMobile && (
              <div className="text-sm text-gray-700">Alt: <a href={`tel:${(c as any).addidtionalMobile}`} className="text-primary hover:underline">{(c as any).addidtionalMobile}</a></div>
            )}
            {!Number.isNaN(Number((c as any).latitude)) && !Number.isNaN(Number((c as any).longitude)) && (
              <div className="mt-2">
                <a className="text-primary hover:underline" href={`https://www.google.com/maps?q=${(c as any).latitude},${(c as any).longitude}`} target="_blank" rel="noreferrer">Navigate</a>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${(c.isActive?.data?.[0] ?? c.isActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                {(c.isActive?.data?.[0] ?? c.isActive) ? 'Active' : 'Inactive'}
              </span>
              <div className="flex items-center gap-3">
                <button className="text-gray-600 hover:text-gray-900" title="Edit" onClick={() => onEdit(c)}>✏️</button>
                <button className="text-red-600 hover:text-red-700" title="Deactivate" onClick={() => onDeactivate(c.id)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
        {customers.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">
            {loading ? 'Loading...' : 'No customers found.'}
          </div>
        )}
      </div>
    </section>
  )
}

export default Customers


