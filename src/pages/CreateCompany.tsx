import { FormEvent, useState } from 'react'
import Button from '../components/Button'
import { buildApiUrl } from '../utils/api'
import { useNavigate } from 'react-router-dom'

function CreateCompany() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '+91',
    isActive: true,
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '+91',
  })
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  function isValidEmail(v: string) {
    return /.+@.+\..+/.test(v)
  }

  function isValidIntlPhone(v: string) {
    return /^\+[0-9]{10,15}$/.test(v)
  }

  const errors = {
    name: touched && !form.name ? 'Company name is required' : '',
    phoneNumber: touched && !isValidIntlPhone(form.phoneNumber) ? 'Phone must be in international format, e.g. +919999999999' : '',
    adminName: touched && !form.adminName ? 'Admin name is required' : '',
    adminEmail: touched && !isValidEmail(form.adminEmail) ? 'Valid email is required' : '',
    adminPassword: touched && form.adminPassword.length < 6 ? 'Password must be at least 6 characters' : '',
    adminPhone: touched && !isValidIntlPhone(form.adminPhone) ? 'Phone must be in international format, e.g. +919999999999' : '',
  }

  const hasErrors = Object.values(errors).some(Boolean)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (hasErrors) return
    try {
      setLoading(true)
      setError(undefined)
      const res = await fetch(buildApiUrl('/tenants'), {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message || 'Failed to create company')
      }
      navigate('/login')
    } catch (err: any) {
      setError(err?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-header border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Create Company</h1>
          <p className="text-sm text-gray-700 mt-1">Create your tenant and initial admin user.</p>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Company name</label>
            <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary" value={form.name} onChange={(e) => update('name', e.target.value)} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Company phone</label>
            <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} placeholder="+919999999999" />
            {errors.phoneNumber && <p className="mt-1 text-xs text-red-600">{errors.phoneNumber}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Admin name</label>
              <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.adminName} onChange={(e) => update('adminName', e.target.value)} />
              {errors.adminName && <p className="mt-1 text-xs text-red-600">{errors.adminName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Admin email</label>
              <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.adminEmail} onChange={(e) => update('adminEmail', e.target.value)} placeholder="admin@company.com" />
              {errors.adminEmail && <p className="mt-1 text-xs text-red-600">{errors.adminEmail}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Admin password</label>
              <input type="password" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.adminPassword} onChange={(e) => update('adminPassword', e.target.value)} />
              {errors.adminPassword && <p className="mt-1 text-xs text-red-600">{errors.adminPassword}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Admin phone</label>
              <input className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.adminPhone} onChange={(e) => update('adminPhone', e.target.value)} placeholder="+919999999999" />
              {errors.adminPhone && <p className="mt-1 text-xs text-red-600">{errors.adminPhone}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => update('isActive', e.target.checked)} />
              Active company
            </label>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create company'}</Button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default CreateCompany


