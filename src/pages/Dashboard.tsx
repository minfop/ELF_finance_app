import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import { buildApiUrl } from '../utils/api'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

type Loan = {
  id: number
  isActive: any
  status: string
  collectionType: string
  installmentAmount: string
}
type LineTypeOpt = { id: number; name: string }

function Dashboard() {
  const token = useSelector((s: RootState) => s.auth.authToken)
  const role = useSelector((s: RootState) => s.auth.role)
  type Analytics = {
    loans: { newLoanCount: number; totalDisbursedAmount: number; totalInitialDeduction: number; totalInterest: number; totalPrincipal: number; totalBalanceAmountInLine: number; totalInvestment: number }
    customers: { newCustomerCount: number }
    installments: { totalCashInHand: number; totalCashInOnline: number; totalCollected: number }
    expenses?: { list?: any[]; totalExpensesAmount?: number }
  }
  const [analyticsTotal, setAnalyticsTotal] = useState<Analytics | null>(null)
  const [analyticsFiltered, setAnalyticsFiltered] = useState<Analytics | null>(null)
  const [lineTypes, setLineTypes] = useState<LineTypeOpt[]>([])
  const [selectedLineTypeId, setSelectedLineTypeId] = useState(0)
  const today = new Date()
  const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  const utcToday = fmt(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())))
  const [fromDate, setFromDate] = useState(utcToday)
  const [toDate, setToDate] = useState(utcToday)
  const [last7, setLast7] = useState<{ label: string; total: number }[] | null>(null)
  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstanceRef = useRef<Chart | null>(null)
  const resizeHandlerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    async function fetchTotals() {
      try {
        const to = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
        const fromTotal = new Date(Date.UTC(2000, 0, 1))
        const f = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
        const url = buildApiUrl(`/loans/analytics?fromDate=${f(fromTotal)}&toDate=${f(to)}`)
        const res = await fetch(url, { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const j = await res.json()
          setAnalyticsTotal(j?.success ? j.data : null)
        }
      } catch {
        // ignore
      }
    }
    fetchTotals()
  }, [token])

  useEffect(() => {
    async function fetchLineTypes() {
      try {
        const res = await fetch(buildApiUrl('/line-types/by-user'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        const j = await res.json()
        const arr = Array.isArray(j?.data) ? j.data : []
        setLineTypes(arr.map((x: any) => ({ id: x.id, name: x.name })))
      } catch {
        // ignore
      }
    }
    fetchLineTypes()
  }, [token])

  function barWidth(value: number, max: number) {
    if (max <= 0) return '0%'
    const pct = Math.min(100, Math.max(0, (value / max) * 100))
    return `${pct}%`
  }

  async function onSubmitFilters(e: FormEvent) {
    e.preventDefault()
    try {
      const ltParam = selectedLineTypeId ? `&lineTypeId=${selectedLineTypeId}` : ''
      const url = buildApiUrl(`/loans/analytics?fromDate=${fromDate}&toDate=${toDate}${ltParam}`)
      const reqs: Promise<Response | null>[] = [
        fetch(url, { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } }),
      ]
      if (selectedLineTypeId) {
        reqs.push(fetch(buildApiUrl(`/installments/last7?lineTypeId=${selectedLineTypeId}`), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } }))
      } else {
        reqs.push(Promise.resolve(null))
      }
      const [analyticsRes, last7Res] = await Promise.all(reqs)
      if (!analyticsRes || !analyticsRes.ok) { setAnalyticsFiltered(null) } else {
        const j = await analyticsRes.json()
        setAnalyticsFiltered(j?.success ? j.data : null)
      }
      if (last7Res && last7Res.ok) {
        const lj = await last7Res.json()
        const periods = Array.isArray(lj?.data?.periods) ? lj.data.periods : []
        setLast7(periods.map((p: any) => ({ label: String(p.label), total: Number(p.total || 0) })))
      } else {
        setLast7(null)
      }
    } catch {
      setAnalyticsFiltered(null)
      setLast7(null)
    }
  }

  useEffect(() => {
    const canvas = chartRef.current
    if (!canvas) return
    if (!last7 || last7.length === 0) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current)
        resizeHandlerRef.current = null
      }
      return
    }
    const labels = last7.map((p) => p.label.slice(5))
    const data = last7.map((p) => p.total)
    const ctx = canvas.getContext('2d')!
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
      chartInstanceRef.current = null
    }
    const inst = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Collections',
            data,
            backgroundColor: ['#ff6384','#36a2eb','#ffcd56','#4bc0c0','#9966ff','#f67019','#00a950'],
            borderColor: '#ffffff',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true },
        },
      },
    })
    chartInstanceRef.current = inst
    // Force resize after mount (helps on mobile when layout settles)
    inst.resize()
    setTimeout(() => inst.resize(), 0)
    const onResize = () => inst.resize()
    window.addEventListener('resize', onResize)
    resizeHandlerRef.current = onResize
    return () => {
      window.removeEventListener('resize', onResize)
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [last7])

  return (
    <section>
      {/* Total analytics */}
      {role === 'admin' && (
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Total Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 bg-[#fff1d6] border border-[#F89344]/30"><div className="text-sm text-gray-700">Loans</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsTotal?.loans.newLoanCount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#fff1d6] border border-[#F89344]/30"><div className="text-sm text-gray-700">Investment Amount</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsTotal?.loans.totalInvestment ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#fff1d6] border border-[#F89344]/30"><div className="text-sm text-gray-700">Closing Balance</div><div className="mt-2 text-2xl font-bold text-gray-900">{(analyticsTotal?.loans.totalInvestment ?? 0) - (analyticsTotal?.loans.totalDisbursedAmount ?? 0)}</div></div>
          <div className="rounded-xl p-4 bg-[#fff1d6] border border-[#F89344]/30"><div className="text-sm text-gray-700">Current Amount in Line</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsTotal?.loans.totalBalanceAmountInLine ?? '-'}</div></div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 bg-[#e6fff7] border border-green-300"><div className="text-sm text-gray-700">Principal Amount</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsTotal?.loans.totalPrincipal ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#e6fff7] border border-green-300"><div className="text-sm text-gray-700">Disbursed Amount</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsTotal?.loans.totalDisbursedAmount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#e8ecff] border border-blue-300"><div className="text-sm text-gray-700">Initial Deduction</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsTotal?.loans.totalInitialDeduction ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#ffe8f2] border border-pink-300"><div className="text-sm text-gray-700">Interest</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsTotal?.loans.totalInterest ?? '-'}</div></div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Customers</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsTotal?.customers.newCustomerCount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Collected</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsTotal?.installments.totalCollected ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Breakdown</div><div className="mt-3 space-y-2">{(() => { const hand = analyticsTotal?.installments.totalCashInHand || 0; const online = analyticsTotal?.installments.totalCashInOnline || 0; const total = Math.max(hand + online, 1); return (<><div className="text-xs text-gray-700">Cash in Hand: ₹ {hand}</div><div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-green-500 rounded" style={{ width: barWidth(hand, total) }} /></div><div className="text-xs text-gray-700">Cash in Online: ₹ {online}</div><div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-blue-500 rounded" style={{ width: barWidth(online, total) }} /></div></>) })()}</div></div>
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Expenses</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsTotal?.expenses?.totalExpensesAmount ?? 0}</div></div>
        </div>
      </div>
      )}

      {/* Filtered analytics */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-lg font-semibold">Overview</h2>
          <form onSubmit={onSubmitFilters} className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <select
              className="h-9 rounded-lg border border-gray-300 px-3 bg-white text-sm"
              value={selectedLineTypeId}
              onChange={(e) => setSelectedLineTypeId(Number(e.target.value))}
            >
              <option value={0}>All Lines</option>
              {lineTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
            <input type="date" className="h-9 rounded-lg border border-gray-300 px-3 bg-white text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input type="date" className="h-9 rounded-lg border border-gray-300 px-3 bg-white text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <button type="submit" className="h-9 rounded-lg bg-primary text-white px-4">Submit</button>
          </form>
        </div>
        {analyticsFiltered ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-xl p-4 bg-[#fff1d6] border border-[#F89344]/30"><div className="text-sm text-gray-700">Loans</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsFiltered.loans.newLoanCount ?? '-'}</div></div>
              <div className="rounded-xl p-4 bg-[#fff1d6] border border-[#F89344]/30"><div className="text-sm text-gray-700">Investment Amount</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsFiltered.loans.totalInvestment ?? '-'}</div></div>
              <div className="rounded-xl p-4 bg-[#fff1d6] border border-[#F89344]/30"><div className="text-sm text-gray-700">Closing Amount</div><div className="mt-2 text-2xl font-bold text-gray-900">{(analyticsFiltered.loans.totalInvestment ?? 0) - (analyticsFiltered.loans.totalDisbursedAmount ?? 0)}</div></div>
              <div className="rounded-xl p-4 bg-[#fff1d6] border border-[#F89344]/30"><div className="text-sm text-gray-700">Total Amount in Line</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsFiltered.loans.totalBalanceAmountInLine ?? '-'}</div></div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 bg-[#e6fff7] border border-green-300"><div className="text-sm text-gray-700">Principal Amount</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsFiltered?.loans.totalPrincipal ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#e6fff7] border border-green-300"><div className="text-sm text-gray-700">Disbursed Amount</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsFiltered?.loans.totalDisbursedAmount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#e8ecff] border border-blue-300"><div className="text-sm text-gray-700">Initial Deduction</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsFiltered?.loans.totalInitialDeduction ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#ffe8f2] border border-pink-300"><div className="text-sm text-gray-700">Interest</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsFiltered?.loans.totalInterest ?? '-'}</div></div>
        </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">New Customers</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsFiltered.customers.newCustomerCount ?? '-'}</div></div>
              <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Collected</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsFiltered.installments.totalCollected ?? '-'}</div></div>
              <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Breakdown</div><div className="mt-3 space-y-2">{(() => { const hand = analyticsFiltered.installments.totalCashInHand || 0; const online = analyticsFiltered.installments.totalCashInOnline || 0; const total = Math.max(hand + online, 1); return (<><div className="text-xs text-gray-700">Cash in Hand: ₹ {hand}</div><div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-green-500 rounded" style={{ width: barWidth(hand, total) }} /></div><div className="text-xs text-gray-700">Cash in Online: ₹ {online}</div><div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-blue-500 rounded" style={{ width: barWidth(online, total) }} /></div></>) })()}</div></div>
              <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Expenses</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsFiltered.expenses?.totalExpensesAmount ?? 0}</div></div>
            </div>
            <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-900">Collections (Last 7 days)</div>
                {!selectedLineTypeId && <div className="text-xs text-gray-500">Select a line type to view chart</div>}
              </div>
              {selectedLineTypeId && last7 && last7.length > 0 ? (
                <div className="h-64 w-full">
                  <canvas ref={chartRef} className="w-full h-full block" />
                </div>
              ) : (
                <div className="text-sm text-gray-600">No data.</div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-600">Select filters and submit to view analytics.</div>
        )}
      </div>
    </section>
  )
}

export default Dashboard


