import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Button from '../components/Button'
import { buildApiUrl } from '../utils/api'

type LoanType = {
  id: number
  tenantId: number
  collectionType: string
  collectionPeriod: number
  interest: number
  initialDeduction: number
  nilCalculation: number
  isActive: number | boolean
  isInterestPreDetection?: number | boolean
  tenantName: string
}

function CollectionTypes() {
  const token = useSelector((s: RootState) => s.auth.authToken)
  const [items, setItems] = useState<LoanType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ collectionType: '', collectionPeriod: 0, interest: 0, initialDeduction: 0, nilCalculation: 0, isActive: true, isInterestPreDetection: false })
  const [touched, setTouched] = useState(false)
  const isEditing = editingId !== null

  const formErrors = useMemo(() => ({
    collectionType: touched && !form.collectionType ? 'Type is required' : '',
    collectionPeriod: touched && (!form.collectionPeriod || form.collectionPeriod <= 0) ? 'Period must be > 0' : '',
    interest: touched && form.interest < 0 ? 'Interest must be >= 0' : '',
    initialDeduction: touched && form.initialDeduction < 0 ? 'Initial deduction must be >= 0' : '',
    nilCalculation: touched && form.nilCalculation < 0 ? 'NIL calculation must be >= 0' : '',
  }), [form, touched])

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  async function fetchList() {
    try {
      setLoading(true)
      setError(undefined)
      const res = await fetch(buildApiUrl('/loan-types'), {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to load types')
      const json = await res.json()
      setItems(Array.isArray(json?.data) ? json.data : [])
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    const hasErrors = Object.values(formErrors).some(Boolean)
    if (hasErrors) return
    try {
      setLoading(true)
      const endpoint = isEditing ? buildApiUrl(`/loan-types/${editingId}`) : buildApiUrl('/loan-types')
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(endpoint, {
        method,
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          collectionType: form.collectionType,
          collectionPeriod: form.collectionPeriod,
          interest: form.interest,
          initialDeduction: form.initialDeduction,
          nilCalculation: form.nilCalculation,
          isInterestPreDetection: form.isInterestPreDetection,
          isActive: form.isActive,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message || (isEditing ? 'Failed to update' : 'Failed to create'))
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ collectionType: '', collectionPeriod: 0, interest: 0, initialDeduction: 0, nilCalculation: 0, isActive: true, isInterestPreDetection: false })
      fetchList()
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  function onEdit(item: LoanType) {
    setShowForm(true)
    setTouched(false)
    setEditingId(item.id)
    setForm({
      collectionType: item.collectionType || '',
      collectionPeriod: item.collectionPeriod || 0,
      interest: Number(item.interest ?? 0),
      initialDeduction: Number(item.initialDeduction ?? 0),
      nilCalculation: Number(item.nilCalculation ?? 0),
      isInterestPreDetection: !!(item.isInterestPreDetection ?? false),
      isActive: !!item.isActive,
    })
  }

  async function onDeactivate(id: number) {
    const ok = window.confirm('Deactivate this loan type?')
    if (!ok) return
    try {
      setLoading(true)
      const res = await fetch(buildApiUrl(`/loan-types/${id}/deactivate`), {
        method: 'PATCH',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to deactivate')
      fetchList()
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Collection Types</h1>
        <Button onClick={() => { setShowForm((v) => !v); setEditingId(null); setForm({ collectionType: '', collectionPeriod: 0, interest: 0, initialDeduction: 0, nilCalculation: 0, isActive: true, isInterestPreDetection: false }); }}>
          {showForm ? 'Cancel' : 'Add Collection Type'}
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit' : 'New'} Collection Type</h2>
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Collection Type</label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3"
                value={form.collectionType}
                onChange={(e) => update('collectionType', e.target.value)}
              >
                <option value="">Select type</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
              {formErrors.collectionType && <p className="mt-1 text-xs text-red-600">{formErrors.collectionType}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Collection Period</label>
              <input type="number" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.collectionPeriod} onChange={(e) => update('collectionPeriod', Number(e.target.value))} />
              {formErrors.collectionPeriod && <p className="mt-1 text-xs text-red-600">{formErrors.collectionPeriod}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Interest</label>
              <input type="number" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.interest} onChange={(e) => update('interest', Number(e.target.value))} />
              {formErrors.interest && <p className="mt-1 text-xs text-red-600">{formErrors.interest}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Initial Deduction</label>
              <input type="number" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.initialDeduction} onChange={(e) => update('initialDeduction', Number(e.target.value))} />
              {formErrors.initialDeduction && <p className="mt-1 text-xs text-red-600">{formErrors.initialDeduction}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">NIL Calculation</label>
              <input type="number" className="mt-1 w-full h-9 rounded-md border border-gray-300 px-3" value={form.nilCalculation} onChange={(e) => update('nilCalculation', Number(e.target.value))} />
              {formErrors.nilCalculation && <p className="mt-1 text-xs text-red-600">{formErrors.nilCalculation}</p>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" checked={form.isInterestPreDetection} onChange={(e) => update('isInterestPreDetection', e.target.checked)} />
              <span className="text-sm text-gray-700">Interest Pre-Deduction</span>
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
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Period</th>
                <th className="text-left px-4 py-2">Interest</th>
                <th className="text-left px-4 py-2">Initial Deduction</th>
                <th className="text-left px-4 py-2">NIL Calc</th>
                <th className="text-left px-4 py-2">Pre-Deduct</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{it.collectionType}</td>
                  <td className="px-4 py-2">{it.collectionPeriod}</td>
                  <td className="px-4 py-2">{Number(it.interest)}</td>
                  <td className="px-4 py-2">{Number(it.initialDeduction)}</td>
                  <td className="px-4 py-2">{Number(it.nilCalculation)}</td>
                  <td className="px-4 py-2">{(it.isInterestPreDetection ?? false) ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${it.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {it.isActive ? 'Active' : 'Inactive'}
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
                  <td className="px-4 py-8 text-center text-gray-600" colSpan={4}>
                    {loading ? 'Loading...' : 'No collection types found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900">{it.collectionType} - {it.collectionPeriod}</div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${it.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                {it.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-700">
              <div>Interest: {Number(it.interest)}</div>
              <div>Init Deduction: {Number(it.initialDeduction)}</div>
              <div>NIL Calc: {Number(it.nilCalculation)}</div>
              <div>Pre-Deduct: {(it.isInterestPreDetection ?? false) ? 'Yes' : 'No'}</div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-3">
              <button className="text-gray-600 hover:text-gray-900" title="Edit" onClick={() => onEdit(it)}>✏️</button>
              <button className="text-red-600 hover:text-red-700" title="Deactivate" onClick={() => onDeactivate(it.id)}>🗑️</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">
            {loading ? 'Loading...' : 'No collection types found.'}
          </div>
        )}
      </div>
    </section>
  )
}

export default CollectionTypes


