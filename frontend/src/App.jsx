import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Classement from './pages/Classement';
import Joueur from './pages/Joueur';
import Recherche from './pages/Recherche';
import LiguesPage from './pages/Ligues';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Comparateur from './pages/Comparateur';
import ComparaisonMois from './pages/ComparaisonMois';
import Welcome from './pages/Welcome';
import Evolution from './pages/Evolution';
import Nationalites from './pages/Nationalites';
import Age from './pages/Age';
import Points from './pages/Points';
import Frequence from './pages/Frequence';


function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Navbar />
      <main className="flex-1 md:ml-[280px] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Page d'accueil */}
        <Route path="/" element={<Welcome />} />

        {/* Pages principales */}
        <Route path="/classement" element={<AppLayout><Classement /></AppLayout>} />
        <Route path="/joueur/:id" element={<AppLayout><Joueur /></AppLayout>} />
        <Route path="/recherche" element={<AppLayout><Recherche /></AppLayout>} />
        <Route path="/ligues" element={<AppLayout><LiguesPage /></AppLayout>} />
        <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/analytics" element={<AppLayout><Analytics /></AppLayout>} />
        <Route path="/comparateur" element={<AppLayout><Comparateur /></AppLayout>} />
        <Route path="/comparaison-mois" element={<AppLayout><ComparaisonMois /></AppLayout>} />

        {/* Pages Statistiques */}
        <Route path="/evolution" element={<AppLayout><Evolution /></AppLayout>} />
        <Route path="/nationalites" element={<AppLayout><Nationalites /></AppLayout>} />
        <Route path="/age" element={<AppLayout><Age /></AppLayout>} />
        <Route path="/points" element={<AppLayout><Points /></AppLayout>} />
        <Route path="/frequence" element={<AppLayout><Frequence /></AppLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
