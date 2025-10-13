function Dashboard() {
  return (
    <section>
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <div className="text-sm text-gray-500">Total Customers</div>
          <div className="mt-2 text-2xl font-bold">1,240</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <div className="text-sm text-gray-500">Active Loans</div>
          <div className="mt-2 text-2xl font-bold">312</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <div className="text-sm text-gray-500">Collections Today</div>
          <div className="mt-2 text-2xl font-bold">₹ 78,900</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <div className="text-sm text-gray-500">Overdue</div>
          <div className="mt-2 text-2xl font-bold">57</div>
        </div>
      </div>
    </section>
  )
}

export default Dashboard


