import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  BarChart2, Zap, Target, Smartphone, ChevronRight,
  Play, Check, TrendingUp, Users, Award, Activity,
  ArrowRight, Star, Shield, Globe
} from 'lucide-react';

/* ─── Animation helpers ─────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] } },
});

function Section({ children, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Stat counter ───────────────────────────────────────────────────────── */
function CountUp({ to, suffix = '' }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = to / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, to]);
  return <span ref={ref}>{val.toLocaleString('fr-FR')}{suffix}</span>;
}

/* ─── Navbar ─────────────────────────────────────────────────────────────── */
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'backdrop-blur-md bg-white/70 shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#CCFF00] flex items-center justify-center">
            <BarChart2 size={16} className="text-[#020617]" />
          </div>
          <span className={`font-extrabold text-lg tracking-tight ${scrolled ? 'text-[#0F172A]' : 'text-white'}`}>
            Padel Stats
          </span>
        </div>

        {/* Links */}
        <div className={`hidden md:flex items-center gap-8 text-sm font-medium ${scrolled ? 'text-[#475569]' : 'text-white/80'}`}>
          <Link to="/fonctionnalites" className="hover:text-[#CCFF00] transition-colors">Fonctionnalités</Link>
          <Link to="/classement" className="hover:text-[#CCFF00] transition-colors">Classement</Link>
          <Link to="/tarifs" className="hover:text-[#CCFF00] transition-colors">Tarifs</Link>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link to="/login" className={`hidden md:block text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
            scrolled
              ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
              : 'border-white/30 text-white hover:border-white/60'
          }`}>
            Se connecter
          </Link>
          <Link to="/login" className="text-sm font-bold px-5 py-2 rounded-full bg-[#CCFF00] text-[#020617] hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all">
            Essai Gratuit
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-screen bg-[#020617] flex items-center overflow-hidden pt-16">
      {/* Grain overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />

      {/* Radial gradient Volt */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(204,255,0,0.08) 0%, transparent 70%)' }} />

      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center py-20">
        {/* Left */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#CCFF00]/30 bg-[#CCFF00]/10 text-[#CCFF00] text-xs font-semibold mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse" />
            Données FFT Ten'Up — Mises à jour en temps réel
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter text-white leading-[1.05] mb-6"
          >
            Ne jouez plus au hasard.{' '}
            <span className="relative inline-block">
              <span className="text-white">Gagnez</span>
              <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-[#CCFF00] rounded-full" />
            </span>
            {' '}par les chiffres.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#94A3B8] text-lg leading-relaxed mb-8 max-w-lg"
          >
            La plateforme d'analyse de performance n°1 pour les joueurs de Padel français.
            Synchronisez vos matchs, analysez vos coups et grimpez au classement FFT.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <Link to="/classement"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#CCFF00] text-[#020617] font-bold text-sm hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all hover:scale-[1.02]"
            >
              Analyser mon profil <ArrowRight size={16} />
            </Link>
            <button className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full border border-white/20 text-white text-sm font-medium hover:border-white/40 transition-colors">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <Play size={12} fill="white" />
              </div>
              Voir la démo
            </button>
          </motion.div>
        </div>

        {/* Right — Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 12 }} animate={{ opacity: 1, y: 0, rotateX: 12 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
          className="hidden md:block"
        >
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
            style={{ transform: 'rotateX(6deg) rotateY(-4deg)' }}>
            {/* Fake browser chrome */}
            <div className="bg-[#0F172A] px-4 py-3 flex items-center gap-2 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 mx-4 h-5 rounded-md bg-white/5 flex items-center px-3">
                <span className="text-white/30 text-xs">padel-stats.fr/analytics</span>
              </div>
            </div>
            {/* Dashboard preview */}
            <div className="bg-[#060d1f] p-5 space-y-4">
              {/* KPI row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Classement', value: '#1 247', delta: '+38' },
                  { label: 'Points FFT', value: '1 842', delta: '+124' },
                  { label: 'Progression', value: '94%', delta: '+12%' },
                ].map((k) => (
                  <div key={k.label} className="bg-[#0F172A] rounded-xl p-3 border border-white/5">
                    <div className="text-white/40 text-[10px] mb-1">{k.label}</div>
                    <div className="text-white font-mono font-bold text-sm">{k.value}</div>
                    <div className="text-[#CCFF00] text-[10px] font-semibold mt-0.5">{k.delta}</div>
                  </div>
                ))}
              </div>
              {/* Fake chart */}
              <div className="bg-[#0F172A] rounded-xl p-4 border border-white/5">
                <div className="text-white/40 text-xs mb-3">Évolution du classement</div>
                <svg viewBox="0 0 300 80" className="w-full">
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#CCFF00" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#CCFF00" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,60 C30,55 60,48 90,40 C120,32 150,28 180,20 C210,12 240,10 300,8" stroke="#CCFF00" strokeWidth="2" fill="none" />
                  <path d="M0,60 C30,55 60,48 90,40 C120,32 150,28 180,20 C210,12 240,10 300,8 L300,80 L0,80Z" fill="url(#g1)" />
                </svg>
              </div>
              {/* Radar hint */}
              <div className="bg-[#0F172A] rounded-xl p-4 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-white/40 text-[10px] mb-1">Profil de jeu</div>
                  <div className="flex gap-2">
                    {['Attaque', 'Défense', 'Régularité'].map((s, i) => (
                      <div key={s} className="flex flex-col gap-1 items-center">
                        <div className="w-2 rounded-full bg-[#CCFF00]" style={{ height: `${[28, 20, 24][i]}px` }} />
                        <span className="text-white/30 text-[8px]">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-16 h-16 relative">
                  <svg viewBox="0 0 80 80">
                    <polygon points="40,5 70,25 70,55 40,75 10,55 10,25" fill="none" stroke="#1e293b" strokeWidth="1" />
                    <polygon points="40,15 58,27 58,53 40,65 22,53 22,27" fill="#CCFF00" fillOpacity="0.15" stroke="#CCFF00" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Social Proof Bar ───────────────────────────────────────────────────── */
function StatsBar() {
  const stats = [
    { value: 149000, suffix: '+', label: 'Joueurs répertoriés' },
    { value: 22, suffix: '', label: 'Ligues régionales' },
    { value: 1200000, suffix: '+', label: 'Points analysés' },
    { value: 98, suffix: '%', label: 'Précision des données' },
  ];
  return (
    <Section>
      <motion.div variants={fadeUp} className="bg-[#0F172A] py-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-extrabold font-mono text-[#CCFF00]">
                <CountUp to={s.value} suffix={s.suffix} />
              </div>
              <div className="text-[#475569] text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}

/* ─── Feature Bento ─────────────────────────────────────────────────────── */
function Features() {
  return (
    <Section id="features" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div variants={fadeUp} className="text-center mb-14">
          <span className="inline-block text-xs font-bold tracking-widest text-[#CCFF00] bg-[#020617] px-3 py-1 rounded-full mb-4 uppercase">Fonctionnalités</span>
          <h2 className="text-4xl font-extrabold tracking-tighter text-[#0F172A]">
            Tout ce qu'il faut pour dominer le terrain
          </h2>
          <p className="text-[#475569] mt-3 max-w-xl mx-auto">Des outils d'analyse puissants, pensés pour les joueurs compétitifs.</p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-fr">
          {/* Card 1 — Large */}
          <motion.div variants={stagger(0.05)}
            className="md:col-span-2 rounded-3xl bg-[#020617] p-8 border border-[#1e293b] overflow-hidden relative group min-h-[260px]">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(204,255,0,0.12) 0%, transparent 70%)' }} />
            <div className="w-10 h-10 rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/20 flex items-center justify-center mb-4">
              <Activity size={20} className="text-[#CCFF00]" />
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Heatmap de précision</h3>
            <p className="text-[#475569] text-sm leading-relaxed mb-6">Visualisez vos zones de force et de faiblesse sur le court. Identifiez où vous gagnez et perdez des points.</p>
            {/* Fake court heatmap */}
            <div className="relative w-full h-24 rounded-xl overflow-hidden border border-[#1e293b]">
              <div className="absolute inset-0 bg-[#0F172A]" />
              <div className="absolute inset-0 flex">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex-1 h-full flex flex-col">
                    {[...Array(4)].map((_, j) => {
                      const heat = Math.random();
                      return <div key={j} className="flex-1" style={{
                        backgroundColor: `rgba(204,255,0,${heat * 0.6})`,
                      }} />;
                    })}
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 border border-[#CCFF00]/20 rounded-xl" />
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div variants={stagger(0.1)}
            className="rounded-3xl bg-[#F8FAFC] p-7 border border-[#E2E8F0] group min-h-[260px]">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
              <Target size={20} className="text-blue-600" />
            </div>
            <h3 className="text-[#0F172A] text-lg font-bold mb-2">Radar de compétences</h3>
            <p className="text-[#475569] text-sm leading-relaxed mb-4">Comparez Attaque, Défense et Régularité en un coup d'œil.</p>
            <svg viewBox="0 0 120 100" className="w-full h-28">
              <polygon points="60,8 100,34 100,74 60,96 20,74 20,34" fill="none" stroke="#E2E8F0" strokeWidth="1" />
              <polygon points="60,28 80,41 80,67 60,76 40,67 40,41" fill="none" stroke="#E2E8F0" strokeWidth="1" />
              <polygon points="60,18 90,37 86,68 60,84 34,68 30,37" fill="rgba(0,71,171,0.15)" stroke="#0047AB" strokeWidth="1.5" />
              <circle cx="60" cy="18" r="2.5" fill="#0047AB" />
              <circle cx="90" cy="37" r="2.5" fill="#0047AB" />
              <circle cx="86" cy="68" r="2.5" fill="#0047AB" />
              <circle cx="60" cy="84" r="2.5" fill="#0047AB" />
              <circle cx="34" cy="68" r="2.5" fill="#0047AB" />
              <circle cx="30" cy="37" r="2.5" fill="#0047AB" />
            </svg>
          </motion.div>

          {/* Card 3 */}
          <motion.div variants={stagger(0.15)}
            className="rounded-3xl bg-[#020617] p-7 border border-[#1e293b] group min-h-[200px]">
            <div className="w-10 h-10 rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/20 flex items-center justify-center mb-4">
              <TrendingUp size={20} className="text-[#CCFF00]" />
            </div>
            <h3 className="text-white text-lg font-bold mb-2">Évolution FFT</h3>
            <p className="text-[#475569] text-sm mb-4">Courbe de progression sur 12 mois.</p>
            <svg viewBox="0 0 120 50" className="w-full">
              <path d="M0,40 C20,38 40,32 60,24 C80,16 100,10 120,6" stroke="#CCFF00" strokeWidth="2" fill="none" />
              <circle cx="120" cy="6" r="3" fill="#CCFF00" />
            </svg>
          </motion.div>

          {/* Card 4 */}
          <motion.div variants={stagger(0.2)}
            className="md:col-span-2 rounded-3xl bg-[#F8FAFC] p-7 border border-[#E2E8F0] group min-h-[200px]">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center mb-4">
              <Users size={20} className="text-pink-600" />
            </div>
            <h3 className="text-[#0F172A] text-lg font-bold mb-2">Comparateur Pro</h3>
            <p className="text-[#475569] text-sm leading-relaxed mb-4">Face-à-face entre deux joueurs : points, progression, historique.</p>
            <div className="flex items-center gap-4">
              {['Joueur A', 'vs', 'Joueur B'].map((item, i) => (
                i === 1
                  ? <div key={i} className="text-[#475569] font-bold text-sm px-2">vs</div>
                  : <div key={i} className="flex-1 bg-white rounded-2xl p-4 border border-[#E2E8F0] text-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">
                        {item[7]}
                      </div>
                      <div className="text-[#0F172A] font-bold text-sm">{item}</div>
                      <div className="text-[#CCFF00] font-mono font-bold text-lg mt-1">{i === 0 ? '1 842' : '1 620'}</div>
                      <div className="text-[#475569] text-xs">pts FFT</div>
                    </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

/* ─── Why Us ─────────────────────────────────────────────────────────────── */
function WhyUs() {
  const points = [
    { icon: Zap, title: 'Data en Temps Réel', desc: 'Mise à jour automatique après chaque tournoi officiel FFT.' },
    { icon: Target, title: 'Précision Chirurgicale', desc: 'Algorithmes basés sur les résultats officiels Ten\'Up.' },
    { icon: Smartphone, title: 'Mobile First', desc: 'Vos stats sur le banc de touche, entre deux sets.' },
  ];
  return (
    <Section className="py-24 bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div variants={fadeUp}>
            <span className="inline-block text-xs font-bold tracking-widest text-[#0047AB] bg-blue-50 px-3 py-1 rounded-full mb-4 uppercase">Performance</span>
            <h2 className="text-4xl font-extrabold tracking-tighter text-[#0F172A] mb-4">
              Conçu pour les compétiteurs, adopté par les clubs.
            </h2>
            <p className="text-[#475569] leading-relaxed mb-8">
              Padel Stats est la référence pour les joueurs qui veulent progresser avec des données réelles, pas des approximations.
            </p>
            <Link to="/classement" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0047AB] hover:text-[#003380] transition-colors">
              Accéder au classement <ChevronRight size={16} />
            </Link>
          </motion.div>

          <div className="space-y-4">
            {points.map((p, i) => (
              <motion.div key={p.title} variants={stagger(i * 0.1)}
                className="flex gap-5 p-5 bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#CCFF00]/40 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#020617] flex items-center justify-center shrink-0">
                  <p.icon size={20} className="text-[#CCFF00]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0F172A] mb-1">{p.title}</h3>
                  <p className="text-[#475569] text-sm leading-relaxed">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── Pricing ────────────────────────────────────────────────────────────── */
function Pricing() {
  const plans = [
    {
      name: 'Gratuit',
      price: '0€',
      per: '',
      desc: 'Pour découvrir la plateforme',
      features: ['Classement national de base', 'Recherche de joueurs (limitée)', 'Top 10 par genre', '5 consultations / jour'],
      cta: 'Commencer gratuitement',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '9.99€',
      per: '/ mois',
      desc: 'Pour les joueurs sérieux',
      features: ['Historique illimité 12 mois', 'Heatmaps avancées', 'Comparateur H2H', 'Export PDF', 'Analytics complets', 'Support prioritaire'],
      cta: 'Essayer Pro',
      highlight: true,
    },
  ];

  return (
    <Section id="pricing" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div variants={fadeUp} className="text-center mb-14">
          <span className="inline-block text-xs font-bold tracking-widest text-[#CCFF00] bg-[#020617] px-3 py-1 rounded-full mb-4 uppercase">Tarifs</span>
          <h2 className="text-4xl font-extrabold tracking-tighter text-[#0F172A]">Simple & transparent</h2>
          <p className="text-[#475569] mt-3">Sans engagement. Annulez à tout moment.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div key={plan.name} variants={stagger(i * 0.1)}
              className={`rounded-3xl p-8 border-2 relative ${
                plan.highlight
                  ? 'border-[#CCFF00] bg-[#020617] shadow-[0_0_40px_rgba(204,255,0,0.12)]'
                  : 'border-[#E2E8F0] bg-[#F8FAFC]'
              }`}>
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#CCFF00] text-[#020617] text-xs font-bold px-4 py-1 rounded-full">
                  Le plus populaire
                </div>
              )}
              <div className={`text-sm font-semibold mb-1 ${plan.highlight ? 'text-[#CCFF00]' : 'text-[#475569]'}`}>{plan.name}</div>
              <div className={`text-4xl font-extrabold font-mono tracking-tight mb-1 ${plan.highlight ? 'text-white' : 'text-[#0F172A]'}`}>
                {plan.price}
                <span className={`text-base font-normal ml-1 ${plan.highlight ? 'text-[#475569]' : 'text-[#94A3B8]'}`}>{plan.per}</span>
              </div>
              <div className={`text-sm mb-6 ${plan.highlight ? 'text-[#475569]' : 'text-[#94A3B8]'}`}>{plan.desc}</div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.highlight ? 'bg-[#CCFF00]/20' : 'bg-green-50'}`}>
                      <Check size={11} className={plan.highlight ? 'text-[#CCFF00]' : 'text-green-600'} />
                    </div>
                    <span className={`text-sm ${plan.highlight ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/classement"
                className={`block text-center py-3 rounded-full font-bold text-sm transition-all ${
                  plan.highlight
                    ? 'bg-[#CCFF00] text-[#020617] hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] hover:scale-[1.02]'
                    : 'bg-white border border-[#E2E8F0] text-[#0F172A] hover:border-[#0F172A]'
                }`}>
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-[#020617] py-12 border-t border-[#1e293b]">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#CCFF00] flex items-center justify-center">
            <BarChart2 size={14} className="text-[#020617]" />
          </div>
          <span className="text-white font-bold">Padel Stats</span>
        </div>
        <p className="text-[#475569] text-sm text-center">Made for the Padel Community — Données FFT Ten'Up</p>
        <div className="flex gap-6 text-[#475569] text-xs">
          <a href="#" className="hover:text-white transition-colors">Mentions légales</a>
          <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Landing() {
  return (
    <div className="font-sans">
      <LandingNav />
      <Hero />
      <StatsBar />
      <Features />
      <WhyUs />
      <Pricing />
      <Footer />
    </div>
  );
}
