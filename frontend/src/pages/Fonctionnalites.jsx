import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  BarChart2, Activity, Target, TrendingUp, Users,
  ArrowRight, ArrowLeft, Zap, Smartphone, Shield,
  Download, Globe, Search, LineChart, Layers, Award
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

const features = [
  {
    icon: Activity,
    title: 'Heatmap de précision',
    desc: 'Visualisez vos zones de force et de faiblesse directement sur le court. Identifiez les zones où vous marquez le plus de points et celles où vous en perdez.',
    details: [
      'Carte thermique interactive du terrain',
      'Filtrage par type de coup (smash, volée, bandeja...)',
      'Comparaison entre périodes',
      'Vue détaillée par set ou par match',
    ],
    color: 'bg-[#CCFF00]/10',
    borderColor: 'border-[#CCFF00]/20',
    iconColor: 'text-[#CCFF00]',
    dark: true,
  },
  {
    icon: Target,
    title: 'Radar de compétences',
    desc: 'Un profil complet de vos forces et faiblesses sur 6 axes clés. Comprenez votre style de jeu en un coup d\'œil.',
    details: [
      'Analyse sur 6 dimensions : Attaque, Défense, Régularité, Service, Volée, Mental',
      'Évolution dans le temps',
      'Comparaison avec d\'autres joueurs',
      'Recommandations personnalisées',
    ],
    color: 'bg-blue-50',
    borderColor: 'border-blue-100',
    iconColor: 'text-blue-600',
    dark: false,
  },
  {
    icon: TrendingUp,
    title: 'Évolution FFT',
    desc: 'Suivez votre progression au classement FFT mois par mois. Visualisez votre courbe de points sur 12 mois.',
    details: [
      'Historique complet sur 12 mois',
      'Graphique de progression interactif',
      'Prédiction de tendance',
      'Alertes de progression / régression',
    ],
    color: 'bg-[#CCFF00]/10',
    borderColor: 'border-[#CCFF00]/20',
    iconColor: 'text-[#CCFF00]',
    dark: true,
  },
  {
    icon: Users,
    title: 'Comparateur H2H',
    desc: 'Comparez vos statistiques avec n\'importe quel joueur inscrit. Analysez les forces et faiblesses de vos adversaires avant un match.',
    details: [
      'Comparaison tête-à-tête complète',
      'Historique des confrontations',
      'Analyse des points forts / faibles',
      'Statistiques détaillées par catégorie',
    ],
    color: 'bg-pink-50',
    borderColor: 'border-pink-100',
    iconColor: 'text-pink-600',
    dark: false,
  },
  {
    icon: Search,
    title: 'Recherche avancée',
    desc: 'Trouvez n\'importe quel joueur parmi les 149 000+ inscrits à la FFT. Filtrez par ligue, classement, genre.',
    details: [
      'Recherche par nom, prénom ou numéro FFT',
      'Filtres par ligue régionale',
      'Tri par classement ou progression',
      'Résultats instantanés',
    ],
    color: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
    iconColor: 'text-emerald-600',
    dark: false,
  },
  {
    icon: Download,
    title: 'Export PDF',
    desc: 'Exportez vos statistiques complètes en PDF pour les partager avec votre coach, votre club ou vos partenaires.',
    details: [
      'Rapport complet avec graphiques',
      'Statistiques détaillées par période',
      'Format professionnel prêt à imprimer',
      'Partage en un clic',
    ],
    color: 'bg-[#CCFF00]/10',
    borderColor: 'border-[#CCFF00]/20',
    iconColor: 'text-[#CCFF00]',
    dark: true,
  },
];

const extras = [
  { icon: Zap, title: 'Données temps réel', desc: 'Synchronisation automatique avec les résultats FFT Ten\'Up.' },
  { icon: Globe, title: '22 ligues couvertes', desc: 'Toutes les ligues régionales françaises de padel.' },
  { icon: Smartphone, title: 'Mobile first', desc: 'Consultez vos stats partout, même entre deux sets.' },
  { icon: Shield, title: 'Données sécurisées', desc: 'Vos données personnelles sont protégées et chiffrées.' },
  { icon: LineChart, title: 'Analytics complets', desc: 'Tableaux de bord interactifs avec toutes vos métriques.' },
  { icon: Award, title: 'Classement national', desc: 'Consultez votre position parmi tous les joueurs français.' },
];

export default function Fonctionnalites() {
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
            <Link to="/fonctionnalites" className="text-[#0F172A] font-semibold">Fonctionnalités</Link>
            <Link to="/classement" className="hover:text-[#0F172A] transition-colors">Classement</Link>
            <Link to="/dashboard" className="hover:text-[#0F172A] transition-colors">Dashboard</Link>
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
            <span className="inline-block text-xs font-bold tracking-widest text-[#CCFF00] bg-[#CCFF00]/10 px-3 py-1 rounded-full mb-4 uppercase">Fonctionnalités</span>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-white leading-[1.05] mb-6 max-w-2xl">
              Des outils puissants pour{' '}
              <span className="text-[#CCFF00]">dominer le terrain</span>
            </h1>
            <p className="text-[#94A3B8] text-lg leading-relaxed max-w-xl">
              Découvrez toutes les fonctionnalités qui font de Padel Stats la plateforme d'analyse n°1 pour les joueurs de Padel en France.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features detail */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 space-y-16">
          {features.map((feat, i) => (
            <Section key={feat.title}>
              <motion.div
                variants={fadeUp}
                className={`rounded-3xl p-8 md:p-10 border-2 ${
                  feat.dark
                    ? 'bg-[#020617] border-[#1e293b]'
                    : 'bg-[#F8FAFC] border-[#E2E8F0]'
                }`}
              >
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <div>
                    <div className={`w-12 h-12 rounded-2xl ${feat.color} border ${feat.borderColor} flex items-center justify-center mb-5`}>
                      <feat.icon size={22} className={feat.iconColor} />
                    </div>
                    <h2 className={`text-2xl font-extrabold tracking-tight mb-3 ${feat.dark ? 'text-white' : 'text-[#0F172A]'}`}>
                      {feat.title}
                    </h2>
                    <p className={`text-base leading-relaxed ${feat.dark ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>
                      {feat.desc}
                    </p>
                  </div>
                  <div>
                    <ul className="space-y-3">
                      {feat.details.map((d) => (
                        <li key={d} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            feat.dark ? 'bg-[#CCFF00]/20' : 'bg-green-50'
                          }`}>
                            <Zap size={10} className={feat.dark ? 'text-[#CCFF00]' : 'text-green-600'} />
                          </div>
                          <span className={`text-sm leading-relaxed ${feat.dark ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
                            {d}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </Section>
          ))}
        </div>
      </section>

      {/* Extras grid */}
      <Section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tighter text-[#0F172A]">Et bien plus encore</h2>
            <p className="text-[#475569] mt-3">Tout ce dont vous avez besoin pour progresser.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {extras.map((e, i) => (
              <motion.div key={e.title} variants={stagger(i * 0.05)}
                className="p-6 bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#CCFF00]/40 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-2xl bg-[#020617] flex items-center justify-center mb-4">
                  <e.icon size={18} className="text-[#CCFF00]" />
                </div>
                <h3 className="font-bold text-[#0F172A] mb-1">{e.title}</h3>
                <p className="text-[#475569] text-sm leading-relaxed">{e.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section className="py-20 bg-[#020617]">
        <motion.div variants={fadeUp} className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold tracking-tighter text-white mb-4">
            Prêt à analyser votre jeu ?
          </h2>
          <p className="text-[#94A3B8] mb-8 max-w-lg mx-auto">
            Commencez gratuitement et accédez à vos statistiques Padel en quelques secondes.
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
