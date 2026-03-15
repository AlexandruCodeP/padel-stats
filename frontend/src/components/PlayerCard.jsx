import { useNavigate } from 'react-router-dom';

export default function PlayerCard({ joueur, rank }) {
    const navigate = useNavigate();
    const evol = joueur.evolution || '=';
    const isPositive = evol.startsWith('+');
    const isNegative = evol.startsWith('-');

    // Circular rank badge colors
    const rankStyle =
        rank === 1 ? { background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }
        : rank === 2 ? { background: 'linear-gradient(135deg, #94A3B8, #64748B)', color: '#fff' }
        : rank === 3 ? { background: 'linear-gradient(135deg, #F97316, #EA580C)', color: '#fff' }
        : null;

    return (
        <div
            onClick={() => navigate(`/joueur/${joueur.id}`)}
            className="bg-card border border-border p-4 cursor-pointer transition-all duration-200"
            style={{ borderRadius: '14px', boxShadow: '0 2px 4px rgb(0 0 0 / 0.04)' }}
            onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(0,71,171,0.12)';
                e.currentTarget.style.borderColor = 'rgba(0,71,171,0.25)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.backgroundColor = 'var(--color-card)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 2px 4px rgb(0 0 0 / 0.04)';
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.transform = '';
            }}
        >
            <div className="flex items-center gap-3">
                {/* ── Circular rank badge ── */}
                <div
                    className="w-10 h-10 rounded-full font-bold text-sm shrink-0 flex items-center justify-center font-data"
                    style={rankStyle ?? {
                        backgroundColor: 'rgba(0,71,171,0.08)',
                        color: '#0047AB',
                        border: '1.5px solid rgba(0,71,171,0.15)',
                    }}
                >
                    {rank || joueur.rang}
                </div>

                {/* ── Name + meta ── */}
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-text truncate text-sm">
                        {joueur.est_anonyme
                            ? <span className="italic text-text-secondary">Joueur anonyme</span>
                            : <>{joueur.prenom} {joueur.nom}</>
                        }
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {!joueur.est_anonyme && joueur.nationalite && (
                            <span className="text-xs text-text-secondary">{joueur.nationalite}</span>
                        )}
                        {joueur.ligue && (
                            <span
                                className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                                style={{
                                    border: `1px solid ${joueur.genre === 'F' ? 'rgba(251,113,133,0.4)' : 'rgba(56,189,248,0.4)'}`,
                                    color: joueur.genre === 'F' ? '#FB7185' : '#38BDF8',
                                    backgroundColor: joueur.genre === 'F' ? 'rgba(251,113,133,0.07)' : 'rgba(56,189,248,0.07)',
                                }}
                            >
                                {joueur.ligue}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Right: points / badge ── */}
                <div className="text-right shrink-0">
                    {joueur.points != null && joueur.points > 0 ? (
                        <div className="font-bold text-text font-data text-sm">
                            {joueur.points.toLocaleString('fr-FR')} pts
                        </div>
                    ) : joueur.est_assimile ? (
                        /* Outline pill badge */
                        <div
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ border: '1.5px solid #F59E0B', color: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.07)' }}
                        >
                            Assimilé
                        </div>
                    ) : joueur.rang <= 10 ? (
                        <div
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ border: '1.5px solid #0047AB', color: '#0047AB', backgroundColor: 'rgba(0,71,171,0.07)' }}
                        >
                            Top classé
                        </div>
                    ) : (
                        <div className="font-bold text-text-secondary text-sm">—</div>
                    )}
                    <div className={`text-xs font-semibold mt-0.5 font-data ${isPositive ? 'text-success' : isNegative ? 'text-danger' : 'text-neutral'}`}>
                        {evol !== '=' ? evol : '='}
                    </div>
                </div>
            </div>
        </div>
    );
}
