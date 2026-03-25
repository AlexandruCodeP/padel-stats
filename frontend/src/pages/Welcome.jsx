import { useNavigate } from 'react-router-dom';

export default function Welcome() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <span className="text-3xl font-black text-primary tracking-tight">Padel</span>
                    <span className="text-3xl font-black text-text tracking-tight">Stats</span>
                </div>
                <h1 className="text-2xl font-bold text-text mb-3">
                    Bienvenue sur votre espace statistiques
                </h1>
                <p className="text-text-secondary text-base mb-10">
                    Suivez l'évolution du classement FFT, analysez les tendances et explorez les données du padel français.
                </p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-8 py-3.5 bg-primary text-white font-semibold rounded-2xl text-base hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                    Accéder au site
                </button>
            </div>
        </div>
    );
}
