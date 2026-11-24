import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ShieldHalf, Eye, EyeOff, Loader2, LogIn, Link2, Fingerprint, Lock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Alert } from '../../components/common/Alert'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const Login = () => {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Where to go once signed in: the page the user originally asked for (set by ProtectedRoute),
  // otherwise the dashboard. Must be used here too: after login() succeeds, isAuthenticated flips
  // and this early return renders before handleSubmit's own navigate() runs.
  const from = location.state?.from
  const afterLogin = from && from !== '/login' ? from : '/dashboard'

  if (isAuthenticated) {
    return <Navigate to={afterLogin} replace />
  }

  const validate = () => {
    const errors = {}
    if (!email.trim()) errors.email = 'Email is required.'
    else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address.'
    if (!password) errors.password = 'Password is required.'
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate(afterLogin, { replace: true })
    } catch (err) {
      setFormError(err.message ?? 'Unable to sign in.')
      setPassword('')
      setIsSubmitting(false)
    }
  }

  const inputClass = (hasError) =>
    `w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
      hasError ? 'border-status-danger' : 'border-slate-300 focus:border-ink-700'
    }`

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink-950 bg-[radial-gradient(ellipse_at_top_left,rgba(47,156,148,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(61,90,134,0.28),transparent_55%)]">
      <div className="hidden lg:flex flex-col justify-center gap-5 px-14 text-white">
        <div className="flex items-center gap-3">
          <ShieldHalf size={40} className="text-accent-400" />
          <span className="text-3xl font-bold tracking-widest">TRACE</span>
        </div>
        <p className="text-lg text-slate-200 max-w-md">
          A Secure Blockchain-Based Platform for Smart Forensic Evidence Management.
        </p>
        <ul className="space-y-2.5 max-w-md text-sm text-slate-300">
          {[
            [Link2, 'Tamper-evident chain of custody'],
            [Fingerprint, 'SHA-256 integrity verification'],
            [Lock, 'Role-based access for every case'],
          ].map(([Icon, label]) => (
            <li key={label} className="flex items-center gap-2.5">
              <Icon size={16} className="text-accent-400 shrink-0" />
              {label}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 max-w-md border-t border-white/10 pt-4">
          This build is a frontend demonstration running on synthetic data —
          the blockchain, backend and AI services are not connected.
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden flex-col items-center gap-2 mb-6 text-white">
            <ShieldHalf size={36} />
            <h1 className="text-lg font-semibold tracking-wide">TRACE</h1>
            <p className="text-sm text-slate-300 text-center">
              Secure Blockchain-Based Forensic Evidence Management
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="bg-white rounded-lg shadow-xl p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Sign in</h2>
              <p className="text-xs text-slate-500 mt-1">Use your TRACE account credentials.</p>
            </div>

            {formError && (
              <div role="alert">
                <Alert variant="danger">{formError}</Alert>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-600 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.email)}
                className={inputClass(fieldErrors.email)}
                placeholder="you@trace.local"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-status-danger">{fieldErrors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-600 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.password)}
                  className={`${inputClass(fieldErrors.password)} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-status-danger">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-ink-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-[11px] text-slate-400 text-center">
              Local demo environment — mock authentication only. Demo credentials are listed in the
              project README.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
