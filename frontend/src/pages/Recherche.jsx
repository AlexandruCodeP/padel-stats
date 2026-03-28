import { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, TrendingUp, Users, Star } from 'lucide-react';
import { rechercher, getTop } from '../api';
import PlayerCard from '../components/PlayerCard';

export default function Recherche() {
    const [query, setQuery] = useState('');
    const [genre, setGenre] = useState('');
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [topH, setTopH] = useState([]);
    const [topF, setTopF] = useState([]);
    const debounce = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        Promise.all([getTop('H', 5), getTop('F', 5)]).then(([h, f]) => {
            setTopH(h);
            setTopF(f);
        });
    }, []);

    const handleInputChange = (val) => {
        setQuery(val);
        if (debounce.current) clearTimeout(debounce.current);
        if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
        debounce.current = setTimeout(async () => {
            const r = await rechercher(val, genre || undefined);
            setSuggestions(r.slice(0, 8));
            setShowSuggestions(true);
        }, 250);
    };

    const doSearch = () => {
        if (query.length < 2) return;
        setLoading(true);
        setShowSuggestions(false);
        rechercher(query, genre || undefined).then(r => {
            setResults(r);
            setSearched(true);
            setLoading(false);
        });
    };

    return (
        <div>
            {/* Hero header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 mb-6">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <h1 className="text-2xl font-bold text-text relative">Recherche de joueurs</h1>
                <p className="text-text-secondary text-sm mt-1 relative">Trouvez n'importe quel joueur parmi 135 000+ classés en France</p>
            </div>

            <div className="bg-card rounded-xl border border-border p-5 mb-6 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-secondary z-10" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Nom ou prénom (min. 2 caractères)..."
                            value={query}
                            onChange={e => handleInputChange(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && doSearch()}
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        {/* Live suggestions dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-xl shadow-xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                                {suggestions.map(s => (
                                    <div key={s.id}
                                        onMouseDown={(e) => { e.preventDefault(); setQuery(`${s.prenom} ${s.nom}`); setShowSuggestions(false); setResults([s]); setSearched(true); }}
                                        className="px-4 py-2.5 text-sm hover:bg-primary/5 cursor-pointer flex items-center justify-between border-b border-border/50 last:border-0 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${s.genre === 'H' ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700'}`}>
                                                {s.rang || '?'}
                                            </div>
                                            <div>
                                                <div className="font-medium">{s.prenom} {s.nom}</div>
                                                <div className="text-xs text-text-secondary">{[s.nationalite, s.club, s.ligue].filter(Boolean).join(' • ')}</div>
                                            </div>
                                        </div>
                                        <span className="text-xs text-text-secondary font-medium">{s.points ? `${s.points.toLocaleString('fr-FR')} pts` : ''}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                        {[
                            { val: '', label: 'Tous' },
                            { val: 'H', label: 'Hommes' },
                            { val: 'F', label: 'Femmes' },
                        ].map(g => (
                            <button
                                key={g.val}
                                onClick={() => setGenre(g.val)}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${genre === g.val ? 'bg-primary text-white' : 'bg-white text-text-secondary hover:bg-gray-50'
                                    }`}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={doSearch}
                        disabled={query.length < 2}
                        className="px-6 py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary-dark disabled:opacity-40 transition-all hover:shadow-lg hover:shadow-primary/20 shrink-0"
                    >
                        Rechercher
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                                    <div className="h-3 bg-gray-200 rounded w-1/5" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : searched ? (
                results.length > 0 ? (
                    <div>
                        <p className="text-sm text-text-secondary mb-3">{results.length} résultat{results.length > 1 ? 's' : ''}</p>
                        <div className="space-y-2">
                            {results.map(j => <PlayerCard key={j.id} joueur={j} />)}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16">
                        {/* Padel racket illustration */}
                        <svg className="w-24 h-24 mx-auto mb-5 opacity-40" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Racket head */}
                            <ellipse cx="50" cy="40" rx="28" ry="33" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" />
                            {/* Strings horizontal */}
                            <line x1="24" y1="22" x2="76" y2="22" stroke="#94a3b8" strokeWidth="0.8" opacity="0.7" />
                            <line x1="22" y1="30" x2="78" y2="30" stroke="#94a3b8" strokeWidth="0.8" opacity="0.7" />
                            <line x1="22" y1="38" x2="78" y2="38" stroke="#94a3b8" strokeWidth="0.8" opacity="0.7" />
                            <line x1="22" y1="46" x2="78" y2="46" stroke="#94a3b8" strokeWidth="0.8" opacity="0.7" />
                            <line x1="24" y1="54" x2="76" y2="54" stroke="#94a3b8" strokeWidth="0.8" opacity="0.7" />
                            <line x1="30" y1="62" x2="70" y2="62" stroke="#94a3b8" strokeWidth="0.8" opacity="0.7" />
                            {/* Strings vertical */}
                            <line x1="34" y1="10" x2="34" y2="70" stroke="#94a3b8" strokeWidth="0.8" opacity="0.7" />
                            <line x1="42" y1="8" x2="42" y2="72" stroke="#94a3b8" strokeWidth="0.8" opacity="0.7" />
                            <line x1="50" y1="7" x2="50" y2="73" stroke="#94a3b8" strokeWidth="0.8" opacity="0.7" />
                            <line x1="58" y1="8" x2="58" y2="72" stroke="#94a3b8" strokeWidth="0.8" opacity="0.7" />
                            <line x1="66" y1="10" x2="66" y2="70" stroke="#94a3b8" strokeWidth="0.8" opacity="0.7" />
                            {/* Handle */}
                            <rect x="43" y="71" width="14" height="32" rx="4" fill="#94a3b8" />
                            {/* Grip tape */}
                            <rect x="44" y="74" width="12" height="2.5" rx="1" fill="#cbd5e1" opacity="0.8" />
                            <rect x="44" y="80" width="12" height="2.5" rx="1" fill="#cbd5e1" opacity="0.8" />
                            <rect x="44" y="86" width="12" height="2.5" rx="1" fill="#cbd5e1" opacity="0.8" />
                            <rect x="44" y="92" width="12" height="2.5" rx="1" fill="#cbd5e1" opacity="0.8" />
                            {/* Ball */}
                            <circle cx="78" cy="80" r="10" fill="#CCFF00" opacity="0.7" stroke="#a3cc00" strokeWidth="1.5" />
                            <path d="M71 74 Q78 80 85 74" stroke="#a3cc00" strokeWidth="1" fill="none" opacity="0.5" />
                            <path d="M71 86 Q78 80 85 86" stroke="#a3cc00" strokeWidth="1" fill="none" opacity="0.5" />
                        </svg>
                        <p className="text-lg font-semibold text-text-secondary">Aucun champion trouvé avec ce nom.</p>
                        <p className="text-sm text-text-secondary mt-1 opacity-70">Vérifiez l'orthographe ou essayez un prénom</p>
                    </div>
                )
            ) : (
                /* Default state with popular players */
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                        <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                            <Star className="w-4 h-4 text-sky-500" /> Top Hommes
                        </h3>
                        <div className="space-y-2">
                            {topH.map(j => <PlayerCard key={j.id} joueur={j} rank={j.rang} />)}
                        </div>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                        <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                            <Star className="w-4 h-4 text-pink-500" /> Top Femmes
                        </h3>
                        <div className="space-y-2">
                            {topF.map(j => <PlayerCard key={j.id} joueur={j} rank={j.rang} />)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
