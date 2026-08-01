import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'MANUFACTURER', label: 'Manufacturer', emoji: '🏭', desc: 'Mint & track plastic batch tokens' },
  { value: 'WHOLESALER', label: 'Wholesaler', emoji: '🚚', desc: 'Receive & forward bulk shipments' },
  { value: 'RETAILER', label: 'Retailer', emoji: '🏪', desc: 'Verify and receive batch shipments' },
  { value: 'CONSUMER', label: 'Consumer', emoji: '🧑‍💼', desc: 'Track products & submit for recycling' },
  { value: 'RECYCLER', label: 'Recycler', emoji: '♻️', desc: 'Process and close recycling loops' },
];

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [selectedRole, setSelectedRole] = useState('MANUFACTURER');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ name, email, password, role: selectedRole, orgName });
      }
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col items-center px-4 py-12">
      {/* Logo + branding */}
      <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg mb-4">
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Plaryu</h1>
      <p className="text-slate-500 mt-1 mb-8">Blockchain Plastic Lifecycle Platform</p>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex mb-6 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${
              mode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${
              mode === 'register' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
            }`}
          >
            Register
          </button>
        </div>

        <h2 className="text-xl font-bold text-slate-900">Select your role</h2>
        <p className="text-sm text-slate-500 mb-4">Access is scoped to your role in the supply chain.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {ROLES.map((role) => (
            <button
              type="button"
              key={role.value}
              onClick={() => setSelectedRole(role.value)}
              className={`text-left p-4 rounded-xl border transition ${
                selectedRole === role.value
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">{role.emoji}</div>
              <div className="font-semibold text-slate-900 text-sm">{role.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{role.desc}</div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Organisation</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="NovaPlast Industries"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="you@organisation.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {localError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {localError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in as User' : `Register as ${selectedRole}`}
          </button>
        </form>
      </div>
    </div>
  );
}
