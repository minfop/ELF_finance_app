import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <section>
      <h1 className="text-2xl font-semibold mb-2">Page Not Found</h1>
      <p className="text-gray-600 mb-4">The page you are looking for doesn't exist.</p>
      <Link to="/" className="text-primary">Go back to Dashboard</Link>
    </section>
  )
}

export default NotFound


