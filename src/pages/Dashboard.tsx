import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import { buildApiUrl } from '../utils/api'

type Loan = {
  id: number
  isActive: any
  status: string
  collectionType: string
  installmentAmount: string
}

function Dashboard() {
  const token = useSelector((s: RootState) => s.auth.authToken)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [activeLoans, setActiveLoans] = useState(0)
  const [collectionsToday, setCollectionsToday] = useState(0)
  const [overdue, setOverdue] = useState(0)
  type Analytics = {
    loans: { newLoanCount: number; totalDisbursedAmount: number; totalInitialDeduction: number; totalInterest: number }
    customers: { newCustomerCount: number }
    installments: { totalCashInHand: number; totalCashInOnline: number; totalCollected: number }
  }
  const [analyticsTotal, setAnalyticsTotal] = useState<Analytics | null>(null)
  const [analyticsToday, setAnalyticsToday] = useState<Analytics | null>(null)
  const [analyticsWeekly, setAnalyticsWeekly] = useState<Analytics | null>(null)
  const [analyticsMonthly, setAnalyticsMonthly] = useState<Analytics | null>(null)

  useEffect(() => {
    async function run() {
      try {
        const [custRes, loanRes] = await Promise.all([
          fetch(buildApiUrl('/customers'), { headers: { accept: '*/*', Authorization: `Bearer ${token}` } }),
          fetch(buildApiUrl('/loans'), { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } }),
        ])
        if (custRes.ok) {
          const cj = await custRes.json()
          setTotalCustomers(Array.isArray(cj?.data) ? cj.data.length : 0)
        }
        if (loanRes.ok) {
          const lj = await loanRes.json()
          const loans: Loan[] = Array.isArray(lj?.data) ? lj.data : []
          const isTrue = (v: any) => (v?.data?.[0] ?? v) ? true : false
          setActiveLoans(loans.filter((l) => isTrue(l.isActive)).length)
          setOverdue(loans.filter((l) => String(l.status).toUpperCase() === 'OVERDUE').length)
          const todayCollections = loans
            .filter((l) => isTrue(l.isActive) && String(l.status).toUpperCase() === 'ONGOING' && String(l.collectionType).toLowerCase() === 'daily')
            .reduce((sum, l) => sum + (parseFloat(l.installmentAmount) || 0), 0)
          setCollectionsToday(todayCollections)
        }
      } catch {
        // ignore dashboard errors
      }
    }
    run()
  }, [token])

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const today = new Date()
        const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
        const to = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
        const dToday = fmt(to)
        const fromWeekly = new Date(to); fromWeekly.setDate(fromWeekly.getDate() - 7)
        const fromMonthly = new Date(to); fromMonthly.setDate(fromMonthly.getDate() - 30)
        const fromTotal = new Date(Date.UTC(2000, 0, 1))

        const urls = [
          { key: 'total', url: buildApiUrl(`/loans/analytics?fromDate=${fmt(fromTotal)}&toDate=${fmt(to)}`) },
          { key: 'today', url: buildApiUrl(`/loans/analytics?fromDate=${dToday}&toDate=${dToday}`) },
          { key: 'weekly', url: buildApiUrl(`/loans/analytics?fromDate=${fmt(fromWeekly)}&toDate=${fmt(to)}`) },
          { key: 'monthly', url: buildApiUrl(`/loans/analytics?fromDate=${fmt(fromMonthly)}&toDate=${fmt(to)}`) },
        ]

        const results = await Promise.all(
          urls.map(({ url }) => fetch(url, { headers: { accept: 'application/json', Authorization: `Bearer ${token}` } }))
        )
        const datas: (Analytics | null)[] = []
        for (const res of results) {
          if (!res.ok) { datas.push(null); continue }
          const j = await res.json()
          datas.push(j?.success ? j.data : null)
        }
        setAnalyticsTotal(datas[0])
        setAnalyticsToday(datas[1])
        setAnalyticsWeekly(datas[2])
        setAnalyticsMonthly(datas[3])
      } catch {
        // ignore
      }
    }
    fetchAnalytics()
  }, [token])

  function barWidth(value: number, max: number) {
    if (max <= 0) return '0%'
    const pct = Math.min(100, Math.max(0, (value / max) * 100))
    return `${pct}%`
  }

  return (
    <section>
      {/* Total analytics */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Total Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 bg-[#fff1d6] border border-[#F89344]/30"><div className="text-sm text-gray-700">New Loans</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsTotal?.loans.newLoanCount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#e6fff7] border border-green-300"><div className="text-sm text-gray-700">Disbursed</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsTotal?.loans.totalDisbursedAmount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#e8ecff] border border-blue-300"><div className="text-sm text-gray-700">Initial Deduction</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsTotal?.loans.totalInitialDeduction ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#ffe8f2] border border-pink-300"><div className="text-sm text-gray-700">Interest</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsTotal?.loans.totalInterest ?? '-'}</div></div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">New Customers</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsTotal?.customers.newCustomerCount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Collected</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsTotal?.installments.totalCollected ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Breakdown</div><div className="mt-3 space-y-2">{(() => { const hand=analyticsTotal?.installments.totalCashInHand||0; const online=analyticsTotal?.installments.totalCashInOnline||0; const total=Math.max(hand+online,1); return (<><div className="text-xs text-gray-700">Cash in Hand: ₹ {hand}</div><div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-green-500 rounded" style={{width:barWidth(hand,total)}} /></div><div className="text-xs text-gray-700">Cash in Online: ₹ {online}</div><div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-blue-500 rounded" style={{width:barWidth(online,total)}} /></div></>) })()}</div></div>
        </div>
      </div>

      {/* Today analytics */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Today</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 bg-[#fff1d6] border border-[#F89344]/30"><div className="text-sm text-gray-700">New Loans</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsToday?.loans.newLoanCount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#e6fff7] border border-green-300"><div className="text-sm text-gray-700">Disbursed</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsToday?.loans.totalDisbursedAmount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#e8ecff] border border-blue-300"><div className="text-sm text-gray-700">Initial Deduction</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsToday?.loans.totalInitialDeduction ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#ffe8f2] border border-pink-300"><div className="text-sm text-gray-700">Interest</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsToday?.loans.totalInterest ?? '-'}</div></div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">New Customers</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsToday?.customers.newCustomerCount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Collected</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsToday?.installments.totalCollected ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Breakdown</div><div className="mt-3 space-y-2">{(() => { const hand=analyticsToday?.installments.totalCashInHand||0; const online=analyticsToday?.installments.totalCashInOnline||0; const total=Math.max(hand+online,1); return (<><div className="text-xs text-gray-700">Cash in Hand: ₹ {hand}</div><div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-green-500 rounded" style={{width:barWidth(hand,total)}} /></div><div className="text-xs text-gray-700">Cash in Online: ₹ {online}</div><div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-blue-500 rounded" style={{width:barWidth(online,total)}} /></div></>) })()}</div></div>
        </div>
      </div>

      {/* Weekly analytics */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Weekly</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 bg-[#fff1d6] border border-[#F89344]/30"><div className="text-sm text-gray-700">New Loans</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsWeekly?.loans.newLoanCount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#e6fff7] border border-green-300"><div className="text-sm text-gray-700">Disbursed</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsWeekly?.loans.totalDisbursedAmount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#e8ecff] border border-blue-300"><div className="text-sm text-gray-700">Initial Deduction</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsWeekly?.loans.totalInitialDeduction ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#ffe8f2] border border-pink-300"><div className="text-sm text-gray-700">Interest</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsWeekly?.loans.totalInterest ?? '-'}</div></div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">New Customers</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsWeekly?.customers.newCustomerCount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Collected</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsWeekly?.installments.totalCollected ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Breakdown</div><div className="mt-3 space-y-2">{(() => { const hand=analyticsWeekly?.installments.totalCashInHand||0; const online=analyticsWeekly?.installments.totalCashInOnline||0; const total=Math.max(hand+online,1); return (<><div className="text-xs text-gray-700">Cash in Hand: ₹ {hand}</div><div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-green-500 rounded" style={{width:barWidth(hand,total)}} /></div><div className="text-xs text-gray-700">Cash in Online: ₹ {online}</div><div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-blue-500 rounded" style={{width:barWidth(online,total)}} /></div></>) })()}</div></div>
        </div>
      </div>

      {/* Monthly analytics */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Monthly</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 bg-[#fff1d6] border border-[#F89344]/30"><div className="text-sm text-gray-700">New Loans</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsMonthly?.loans.newLoanCount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#e6fff7] border border-green-300"><div className="text-sm text-gray-700">Disbursed</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsMonthly?.loans.totalDisbursedAmount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#e8ecff] border border-blue-300"><div className="text-sm text-gray-700">Initial Deduction</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsMonthly?.loans.totalInitialDeduction ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-[#ffe8f2] border border-pink-300"><div className="text-sm text-gray-700">Interest</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsMonthly?.loans.totalInterest ?? '-'}</div></div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">New Customers</div><div className="mt-2 text-2xl font-bold text-gray-900">{analyticsMonthly?.customers.newCustomerCount ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Collected</div><div className="mt-2 text-2xl font-bold text-gray-900">₹ {analyticsMonthly?.installments.totalCollected ?? '-'}</div></div>
          <div className="rounded-xl p-4 bg-white border border-gray-200"><div className="text-sm text-gray-500">Breakdown</div><div className="mt-3 space-y-2">{(() => { const hand=analyticsMonthly?.installments.totalCashInHand||0; const online=analyticsMonthly?.installments.totalCashInOnline||0; const total=Math.max(hand+online,1); return (<><div className="text-xs text-gray-700">Cash in Hand: ₹ {hand}</div><div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-green-500 rounded" style={{width:barWidth(hand,total)}} /></div><div className="text-xs text-gray-700">Cash in Online: ₹ {online}</div><div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-blue-500 rounded" style={{width:barWidth(online,total)}} /></div></>) })()}</div></div>
        </div>
      </div>
    </section>
  )
}

export default Dashboard


