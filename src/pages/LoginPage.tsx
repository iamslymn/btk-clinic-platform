import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { getDashboardPath } from '../lib/routes';
import { t } from '../lib/i18n';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, user, role } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user && role) {
      const dashboardPath = getDashboardPath(role);
      navigate(dashboardPath, { replace: true });
    }
  }, [user, role, navigate]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn(email, password);
      
      if (result.ok) {

        // Navigation will be handled by the useEffect above
      } else {
        setError(result.error || 'Giriş uğursuz oldu');
      }
    } catch (err: any) {
      setError('Gözlənilməz xəta baş verdi. Yenidən cəhd edin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">BTK</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {t('pages.login.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('pages.login.subtitle')}
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="card">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="form-label">
                  {t('forms.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="form-input"
                  placeholder={t('pages.login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  {t('forms.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="form-input pr-10"
                    placeholder={t('pages.login.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    {t('pages.login.loginButton')}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}