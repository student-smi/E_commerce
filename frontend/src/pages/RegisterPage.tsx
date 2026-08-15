import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      login(data.token, data.userId, 'user');
      navigate('/products');
    } catch (err: any) {
      if (err.response?.data?.details) {
        setErrors(err.response.data.details);
      } else {
        setErrors({ _: [err.response?.data?.error || 'Registration failed. Please try again.'] });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50/50 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-10">
        <div className="text-center mb-6 sm:mb-8">
          <span className="w-12 h-12 bg-black text-white rounded-2xl inline-flex items-center justify-center text-xl font-bold mb-3 shadow-md">
            ✨
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Create Account
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Join us for seamless shopping & quick checkout
          </p>
        </div>

        {errors._ && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs sm:text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{errors._[0]}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              required
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-black transition-all"
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-black transition-all"
            />
            {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
              Password (min. 8 characters)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-black transition-all"
            />
            {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password[0]}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base hover:bg-gray-800 active:scale-[0.99] disabled:opacity-50 transition-all shadow-md mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Free Account</span>
            )}
          </button>
        </form>

        <p className="mt-6 text-xs sm:text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-black font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
