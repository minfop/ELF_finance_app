import { Link } from 'react-router-dom'

function CreateAdmin() {
  return (
    <section className="max-w-2xl">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-header border-b border-gray-200">
          <h1 className="text-2xl font-semibold">Create Admin User</h1>
        </div>
        <div className="p-6">
          <p className="text-gray-700">You must create a company first before adding an admin user.</p>
          <Link to="/create-company" className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 bg-primary text-white hover:opacity-90">
            Create a Company
          </Link>
        </div>
      </div>
    </section>
  )
}

export default CreateAdmin


