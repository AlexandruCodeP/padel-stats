import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart2, Eye, EyeOff, ArrowLeft, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authLogin, authRegister } from '../api';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [showPwd, setShowPwd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/classement';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = mode === 'login'
        ? await authLogin(email, password)
        : await authRegister(name, email, password);
      login(data.token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m) {
    setMode(m);
    setError('');
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col">
      {/* Back link */}
      <div className="p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-[#475569] hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} />
          Retour à l'accueil
        </Link>
      </div>

      {/* Radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(204,255,0,0.06) 0%, transparent 70%)' }} />

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-[#CCFF00] flex items-center justify-center group-hover:scale-105 transition-transform">
                <BarChart2 size={20} className="text-[#020617]" />
              </div>
              <span className="text-white font-extrabold text-xl tracking-tight">Padel Stats</span>
            </Link>
          </div>

          {/* Card container */}
          <div className="bg-[#0F172A] border border-[#1e293b] rounded-3xl p-8">
            {/* Tab switcher */}
            <div className="flex bg-[#020617] rounded-2xl p-1 mb-8">
              {['login', 'register'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    mode === m
                      ? 'bg-[#CCFF00] text-[#020617] shadow-sm'
                      : 'text-[#475569] hover:text-white'
                  }`}
                >
                  {m === 'login' ? 'Se connecter' : 'Créer un compte'}
                </button>
              ))}
            </div>

            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
            >
              <h1 className="text-white text-2xl font-extrabold tracking-tight mb-1">
                {mode === 'login' ? 'Bon retour' : 'Créer votre compte'}
              </h1>
              <p className="text-[#475569] text-sm mb-6">
                {mode === 'login'
                  ? 'Accédez à vos statistiques et analyses.'
                  : 'Rejoignez 149 000+ joueurs de padel.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name (register only) */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wider">
                      Nom complet
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155]" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jean Dupont"
                        required
                        className="w-full bg-[#020617] border border-[#1e293b] rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-[#334155] focus:outline-none focus:border-[#CCFF00]/50 focus:ring-1 focus:ring-[#CCFF00]/20 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      required
                      className="w-full bg-[#020617] border border-[#1e293b] rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-[#334155] focus:outline-none focus:border-[#CCFF00]/50 focus:ring-1 focus:ring-[#CCFF00]/20 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Mot de passe
                    </label>
                    {mode === 'login' && (
                      <button type="button" className="text-xs text-[#CCFF00] hover:text-white transition-colors">
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155]" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="w-full bg-[#020617] border border-[#1e293b] rounded-xl pl-11 pr-11 py-3 text-white text-sm placeholder-[#334155] focus:outline-none focus:border-[#CCFF00]/50 focus:ring-1 focus:ring-[#CCFF00]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#334155] hover:text-[#64748B] transition-colors"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full mt-2 py-3.5 rounded-full bg-[#CCFF00] text-[#020617] font-bold text-sm hover:shadow-[0_0_20px_rgba(204,255,0,0.35)] hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-[#1e293b]" />
                  <span className="text-[#334155] text-xs">ou continuer avec</span>
                  <div className="flex-1 h-px bg-[#1e293b]" />
                </div>

                {/* OAuth buttons (non implémentés) */}
                <div className="grid grid-cols-2 gap-3">
                  {['Google', "FFT Ten'Up"].map((provider) => (
                    <button
                      key={provider}
                      type="button"
                      disabled
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#1e293b] text-[#475569] text-xs font-medium cursor-not-allowed opacity-50"
                    >
                      {provider}
                    </button>
                  ))}
                </div>
              </form>
            </motion.div>
          </div>

          <p className="text-center text-[#334155] text-xs mt-6">
            En continuant, vous acceptez nos{' '}
            <a href="#" className="text-[#475569] hover:text-white transition-colors">CGU</a>
            {' '}et notre{' '}
            <a href="#" className="text-[#475569] hover:text-white transition-colors">Politique de confidentialité</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
