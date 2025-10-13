import { type FormEvent, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loginAsync } from '../store/slices/authSlice'
import type { AppDispatch } from '../store/store'
import { Link, useNavigate } from 'react-router-dom'
import { type RootState } from '../store/store'
import Button from '../components/Button'

function isValidPhone(number: string): boolean {
  return /^[0-9]{10}$/.test(number)
}

function Login() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { loading, error } = useSelector((s: RootState) => s.auth)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)
  
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!isValidPhone(phone) || !password) return
    const payload = { phoneNumber: `+91${phone}`, password }
    const result = await dispatch(loginAsync(payload))
    if (loginAsync.fulfilled.match(result)) {
      navigate('/')
    }
  }

  const phoneError = touched && !isValidPhone(phone) ? 'Enter 10 digit number' : ''
  const passwordError = touched && !password ? 'Password is required' : ''

  return (
    <div className="mx-auto max-w-5xl min-h-[70vh] grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 place-items-center md:items-stretch">
      {/* Left info panel */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm h-full w-full">
        <h2 className="text-xl font-semibold text-gray-900">New to ELF Finance?</h2>
        <p className="mt-2 text-sm text-gray-700">
          Create your company to get started. The first user created will be the admin user for your tenant.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <Link to="/create-company" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 bg-primary text-white hover:opacity-90">
            Create Company
          </Link>
        </div>
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900">What you'll need</h3>
          <ul className="mt-2 list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Company name and phoneNumber</li>
            <li>Admin name, email, phone and password</li>
          </ul>
        </div>
      </div>

      {/* Right login form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm h-full w-full">
        <h1 className="text-2xl font-semibold mb-6 text-gray-900">Sign in</h1>
        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <form onSubmit={onSubmit} className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
          <div className="flex gap-2">
            <div className="h-9 px-3 rounded-md border border-gray-300 bg-gray-50 text-gray-700 flex items-center">+91</div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              className="flex-1 h-9 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter 10 digit number"
            />
          </div>
          {phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}

          <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-9 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter password"
          />
          {passwordError && <p className="mt-1 text-xs text-red-600">{passwordError}</p>}

          <div className="mt-6">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login


