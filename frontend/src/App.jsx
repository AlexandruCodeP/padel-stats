import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Classement from './pages/Classement';
import Joueur from './pages/Joueur';
import Recherche from './pages/Recherche';
import LiguesPage from './pages/Ligues';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Comparateur from './pages/Comparateur';
import ComparaisonMois from './pages/ComparaisonMois';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Fonctionnalites from './pages/Fonctionnalites';
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
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pages publiques */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/fonctionnalites" element={<Fonctionnalites />} />


          {/* Pages protegees */}
          <Route path="/classement" element={<ProtectedRoute><AppLayout><Classement /></AppLayout></ProtectedRoute>} />
          <Route path="/joueur/:id" element={<ProtectedRoute><AppLayout><Joueur /></AppLayout></ProtectedRoute>} />
          <Route path="/recherche" element={<ProtectedRoute><AppLayout><Recherche /></AppLayout></ProtectedRoute>} />
          <Route path="/ligues" element={<ProtectedRoute><AppLayout><LiguesPage /></AppLayout></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AppLayout><Analytics /></AppLayout></ProtectedRoute>} />
          <Route path="/comparateur" element={<ProtectedRoute><AppLayout><Comparateur /></AppLayout></ProtectedRoute>} />
          <Route path="/comparaison-mois" element={<ProtectedRoute><AppLayout><ComparaisonMois /></AppLayout></ProtectedRoute>} />

          {/* Nouvelles pages Statistiques */}
          <Route path="/evolution" element={<ProtectedRoute><AppLayout><Evolution /></AppLayout></ProtectedRoute>} />
          <Route path="/nationalites" element={<ProtectedRoute><AppLayout><Nationalites /></AppLayout></ProtectedRoute>} />
          <Route path="/age" element={<ProtectedRoute><AppLayout><Age /></AppLayout></ProtectedRoute>} />
          <Route path="/points" element={<ProtectedRoute><AppLayout><Points /></AppLayout></ProtectedRoute>} />
          <Route path="/frequence" element={<ProtectedRoute><AppLayout><Frequence /></AppLayout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
