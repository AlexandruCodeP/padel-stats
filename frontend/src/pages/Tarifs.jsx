import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  BarChart2, Check, X, ArrowRight, ArrowLeft,
  ChevronDown, ChevronUp, HelpCircle
} from 'lucide-react';

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

const plans = [
  {
    name: 'Gratuit',
    price: '0€',
    per: '',
    desc: 'Pour découvrir la plateforme et suivre vos stats de base.',
    features: [
      'Classement national de base',
      'Recherche de joueurs (limitée)',
      'Top 10 par genre',
      '5 consultations / jour',
      'Profil joueur basique',
    ],
    cta: 'Commencer gratuitement',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '9.99€',
    per: '/ mois',
    desc: 'Pour les joueurs sérieux qui veulent progresser avec des données complètes.',
    features: [
      'Historique illimité 12 mois',
      'Heatmaps avancées',
      'Comparateur H2H illimité',
      'Export PDF professionnel',
      'Analytics complets',
      'Radar de compétences',
      'Recherche illimitée',
      'Consultations illimitées',
      'Support prioritaire',
    ],
    cta: 'Essayer Pro',
    highlight: true,
  },
];

const comparison = [
  { feature: 'Classement national', free: true, pro: true },
  { feature: 'Recherche de joueurs', free: 'Limitée', pro: 'Illimitée' },
  { feature: 'Consultations / jour', free: '5', pro: 'Illimitées' },
  { feature: 'Profil joueur', free: 'Basique', pro: 'Complet' },
  { feature: 'Historique de progression', free: false, pro: '12 mois' },
  { feature: 'Heatmaps', free: false, pro: true },
  { feature: 'Radar de compétences', free: false, pro: true },
  { feature: 'Comparateur H2H', free: false, pro: true },
  { feature: 'Export PDF', free: false, pro: true },
  { feature: 'Analytics avancés', free: false, pro: true },
  { feature: 'Support prioritaire', free: false, pro: true },
];

const faqs = [
  {
    q: 'Puis-je annuler mon abonnement à tout moment ?',
    a: 'Oui, l\'abonnement Pro est sans engagement. Vous pouvez annuler à tout moment depuis votre tableau de bord, et vous conserverez l\'accès jusqu\'à la fin de la période payée.',
  },
  {
    q: 'D\'où viennent les données ?',
    a: 'Toutes nos données proviennent directement de la FFT Ten\'Up, la plateforme officielle de la Fédération Française de Tennis et de Padel. Elles sont mises à jour automatiquement après chaque tournoi.',
  },
  {
    q: 'Le plan Gratuit est-il vraiment gratuit ?',
    a: 'Absolument. Le plan Gratuit est 100% gratuit, sans carte bancaire requise. Vous pouvez l\'utiliser aussi longtemps que vous le souhaitez.',
  },
  {
    q: 'Puis-je passer de Gratuit à Pro à tout moment ?',
    a: 'Oui, vous pouvez upgrader vers le plan Pro à tout moment. Le changement est immédiat et vous aurez accès à toutes les fonctionnalités Pro dès la souscription.',
  },
  {
    q: 'Les données sont-elles sécurisées ?',
    a: 'Oui, vos données personnelles sont protégées et chiffrées. Nous ne partageons jamais vos informations avec des tiers.',
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-semibold text-[#0F172A] text-sm pr-4">{q}</span>
        {open ? <ChevronUp size={18} className="text-[#475569] shrink-0" /> : <ChevronDown size={18} className="text-[#475569] shrink-0" />}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          className="px-5 pb-5"
        >
          <p className="text-[#475569] text-sm leading-relaxed">{a}</p>
        </motion.div>
      )}
    </div>
  );
}

function CellValue({ value }) {
  if (value === true) return <Check size={16} className="text-green-600 mx-auto" />;
  if (value === false) return <X size={16} className="text-[#CBD5E1] mx-auto" />;
  return <span className="text-sm text-[#475569]">{value}</span>;
}

export default function Tarifs() {
  return (
    <div className="font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/70 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#CCFF00] flex items-center justify-center">
              <BarChart2 size={16} className="text-[#020617]" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-[#0F172A]">Padel Stats</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#475569]">
            <Link to="/fonctionnalites" className="hover:text-[#0F172A] transition-colors">Fonctionnalités</Link>
            <Link to="/classement" className="hover:text-[#0F172A] transition-colors">Classement</Link>
            <Link to="/tarifs" className="text-[#0F172A] font-semibold">Tarifs</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden md:block text-sm font-medium px-4 py-2 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
              Se connecter
            </Link>
            <Link to="/login" className="text-sm font-bold px-5 py-2 rounded-full bg-[#CCFF00] text-[#020617] hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all">
              Essai Gratuit
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#020617] pt-32 pb-20 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(204,255,0,0.08) 0%, transparent 70%)' }} />
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link to="/" className="inline-flex items-center gap-2 text-[#475569] text-sm hover:text-white transition-colors mb-8">
              <ArrowLeft size={14} /> Retour à l'accueil
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <span className="inline-block text-xs font-bold tracking-widest text-[#CCFF00] bg-[#CCFF00]/10 px-3 py-1 rounded-full mb-4 uppercase">Tarifs</span>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-white leading-[1.05] mb-6 max-w-2xl">
              Simple, transparent,{' '}
              <span className="text-[#CCFF00]">sans engagement</span>
            </h1>
            <p className="text-[#94A3B8] text-lg leading-relaxed max-w-xl">
              Commencez gratuitement et passez à Pro quand vous êtes prêt. Annulez à tout moment.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing cards */}
      <Section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
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
                <div className={`text-5xl font-extrabold font-mono tracking-tight mb-1 ${plan.highlight ? 'text-white' : 'text-[#0F172A]'}`}>
                  {plan.price}
                  <span className={`text-base font-normal ml-1 ${plan.highlight ? 'text-[#475569]' : 'text-[#94A3B8]'}`}>{plan.per}</span>
                </div>
                <div className={`text-sm mb-8 ${plan.highlight ? 'text-[#475569]' : 'text-[#94A3B8]'}`}>{plan.desc}</div>
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
                <Link to="/login"
                  className={`block text-center py-3.5 rounded-full font-bold text-sm transition-all ${
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

      {/* Comparison table */}
      <Section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tighter text-[#0F172A]">Comparaison détaillée</h2>
            <p className="text-[#475569] mt-3">Voyez exactement ce qui est inclus dans chaque plan.</p>
          </motion.div>
          <motion.div variants={fadeUp} className="bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-5 border-b border-[#E2E8F0] text-left text-sm font-semibold text-[#475569]">Fonctionnalité</th>
                  <th className="p-5 border-b border-[#E2E8F0] text-center text-sm font-bold text-[#0F172A]">Gratuit</th>
                  <th className="p-5 border-b border-[#E2E8F0] text-center text-sm font-bold text-[#CCFF00] bg-[#020617]">Pro</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr key={row.feature}>
                    <td className={`p-4 border-b border-[#E2E8F0] ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <span className="text-sm text-[#0F172A]">{row.feature}</span>
                    </td>
                    <td className={`p-4 border-b border-[#E2E8F0] text-center ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <CellValue value={row.free} />
                    </td>
                    <td className="p-4 border-b border-[#E2E8F0] text-center bg-[#020617]">
                      {row.pro === true ? (
                        <Check size={16} className="text-[#CCFF00] mx-auto" />
                      ) : row.pro === false ? (
                        <X size={16} className="text-[#475569] mx-auto" />
                      ) : (
                        <span className="text-sm text-[#CBD5E1]">{row.pro}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </Section>

      {/* FAQ */}
      <Section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <div className="w-12 h-12 rounded-2xl bg-[#020617] flex items-center justify-center mx-auto mb-4">
              <HelpCircle size={22} className="text-[#CCFF00]" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tighter text-[#0F172A]">Questions fréquentes</h2>
            <p className="text-[#475569] mt-3">Tout ce que vous devez savoir sur nos offres.</p>
          </motion.div>
          <motion.div variants={fadeUp} className="space-y-3">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </motion.div>
        </div>
      </Section>

      {/* CTA */}
      <Section className="py-20 bg-[#020617]">
        <motion.div variants={fadeUp} className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold tracking-tighter text-white mb-4">
            Prêt à passer au niveau supérieur ?
          </h2>
          <p className="text-[#94A3B8] mb-8 max-w-lg mx-auto">
            Rejoignez les milliers de joueurs qui utilisent Padel Stats pour progresser.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#CCFF00] text-[#020617] font-bold text-sm hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all hover:scale-[1.02]">
              Commencer gratuitement <ArrowRight size={16} />
            </Link>
            <Link to="/fonctionnalites"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/20 text-white text-sm font-medium hover:border-white/40 transition-colors">
              Voir les fonctionnalités
            </Link>
          </div>
        </motion.div>
      </Section>

      {/* Footer */}
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
    </div>
  );
}
