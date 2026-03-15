import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Search, Users, LayoutDashboard, TrendingUp, GitCompare, Moon, Sun, Activity, Home, CalendarArrowUp, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const links = [
    { to: '/classement', label: 'Classement', icon: BarChart3 },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/analytics', label: 'Analytics', icon: TrendingUp },
    { to: '/recherche', label: 'Recherche', icon: Search },
    { to: '/ligues', label: 'Ligues', icon: Users },
    { to: '/comparateur', label: 'Comparer', icon: GitCompare },
    { to: '/comparaison-mois', label: 'Mois vs Mois', icon: CalendarArrowUp },
];

const SIDEBAR_BG = '#0F172A';
const VOLT = '#CCFF00';
const INACTIVE = '#64748B';
const HOVER_COLOR = '#CBD5E1';
const HOVER_BG = 'rgba(255,255,255,0.06)';

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [dark, setDark] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' ||
                (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    useEffect(() => {
        if (dark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [dark]);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    // Initiales pour l'avatar
    const initials = user?.name
        ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        : '?';

    return (
        <>
            {/* ═══════════════════════════════════
                  DESKTOP — Fixed Sidebar 280px
                ═══════════════════════════════════ */}
            <aside
                className="hidden md:flex flex-col fixed top-0 left-0 h-full z-50"
                style={{ width: '280px', backgroundColor: SIDEBAR_BG }}
            >
                {/* ── Logo ── */}
                <div className="px-6 py-5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <Link to="/classement" className="flex items-center gap-3 no-underline group">
                        <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                            style={{ backgroundColor: '#0047AB' }}
                        >
                            <Activity className="w-5 h-5" style={{ color: VOLT }} />
                        </div>
                        <div>
                            <div
                                className="font-bold text-base leading-tight tracking-tight"
                                style={{ color: '#F8FAFC' }}
                            >
                                Padel Stats
                            </div>
                            <div className="text-xs font-medium" style={{ color: INACTIVE }}>
                                Pro · France
                            </div>
                        </div>
                    </Link>
                </div>

                {/* ── Nav section label ── */}
                <div className="px-6 pt-5 pb-2">
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(100,116,139,0.7)' }}>
                        Navigation
                    </span>
                </div>

                {/* ── Nav links ── */}
                <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
                    {links.map(({ to, label, icon: Icon }) => {
                        const active = location.pathname === to;
                        return (
                            <SidebarLink key={to} to={to} label={label} Icon={Icon} active={active} />
                        );
                    })}
                </nav>

                {/* ── Back to Landing ── */}
                <div className="px-4 pb-3 shrink-0">
                    <Link
                        to="/"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
                        style={{ color: '#475569' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(204,255,0,0.07)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <Home style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Retour à l'accueil</span>
                    </Link>
                </div>

                {/* ── Dark mode toggle ── */}
                <div className="px-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '16px' }}>
                    <div
                        className="flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all duration-200"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                        onClick={() => setDark(d => !d)}
                    >
                        <div className="flex items-center gap-3">
                            {dark
                                ? <Sun className="w-4 h-4 shrink-0" style={{ color: VOLT }} />
                                : <Moon className="w-4 h-4 shrink-0" style={{ color: INACTIVE }} />
                            }
                            <span className="text-sm font-medium" style={{ color: dark ? '#CBD5E1' : INACTIVE }}>
                                {dark ? 'Mode clair' : 'Mode sombre'}
                            </span>
                        </div>
                        <div
                            className="relative shrink-0 transition-colors duration-300"
                            style={{
                                width: '40px', height: '22px',
                                borderRadius: '11px',
                                backgroundColor: dark ? VOLT : 'rgba(255,255,255,0.15)',
                            }}
                        >
                            <div
                                className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all duration-300"
                                style={{ left: dark ? 'calc(100% - 20px)' : '2px' }}
                            />
                        </div>
                    </div>
                </div>

                {/* ── User widget ── */}
                <div className="px-4 py-4 shrink-0">
                    {user ? (
                        <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                            {/* Avatar */}
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                                style={{ backgroundColor: VOLT, color: '#020617' }}
                            >
                                {initials}
                            </div>
                            {/* Name + email */}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate" style={{ color: '#E2E8F0' }}>
                                    {user.name}
                                </div>
                                <div className="text-xs truncate" style={{ color: INACTIVE }}>
                                    {user.email}
                                </div>
                            </div>
                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                title="Se déconnecter"
                                className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-red-500/20"
                                style={{ color: INACTIVE }}
                                onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                                onMouseLeave={e => e.currentTarget.style.color = INACTIVE}
                            >
                                <LogOut size={15} />
                            </button>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                            style={{ backgroundColor: VOLT, color: '#020617' }}
                        >
                            Se connecter
                        </Link>
                    )}
                </div>
            </aside>

            {/* ═══════════════════════════════════
                  MOBILE — Fixed Bottom Bar
                ═══════════════════════════════════ */}
            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-50"
                style={{
                    backgroundColor: SIDEBAR_BG,
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    paddingBottom: 'env(safe-area-inset-bottom)',
                }}
            >
                <div className="flex items-center justify-around px-1 py-1.5">
                    {links.map(({ to, label, icon: Icon }) => {
                        const active = location.pathname === to;
                        return (
                            <Link
                                key={to}
                                to={to}
                                className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-xl no-underline transition-all duration-200 flex-1 min-w-0"
                                style={{ color: active ? VOLT : INACTIVE }}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                <span className="font-medium truncate" style={{ fontSize: '9px' }}>
                                    {label}
                                </span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={() => setDark(d => !d)}
                        className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-xl transition-all duration-200 flex-1"
                        style={{ color: INACTIVE }}
                    >
                        {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        <span style={{ fontSize: '9px' }} className="font-medium">Thème</span>
                    </button>
                    {user && (
                        <button
                            onClick={handleLogout}
                            className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-xl transition-all duration-200 flex-1"
                            style={{ color: INACTIVE }}
                        >
                            <LogOut className="w-5 h-5" />
                            <span style={{ fontSize: '9px' }} className="font-medium">Quitter</span>
                        </button>
                    )}
                </div>
            </nav>
        </>
    );
}

/* ── SidebarLink sub-component ── */
function SidebarLink({ to, label, Icon, active }) {
    const [hovered, setHovered] = useState(false);

    const baseStyle = {
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px',
        borderRadius: '12px',
        fontSize: '14px', fontWeight: '500',
        textDecoration: 'none',
        transition: 'all 0.15s ease',
        position: 'relative',
    };

    const activeStyle = {
        ...baseStyle,
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        color: VOLT,
        borderLeft: `4px solid ${VOLT}`,
        paddingLeft: '8px',
    };

    const hoverStyle = {
        ...baseStyle,
        backgroundColor: HOVER_BG,
        color: HOVER_COLOR,
    };

    const defaultStyle = {
        ...baseStyle,
        color: INACTIVE,
    };

    return (
        <Link
            to={to}
            style={active ? activeStyle : hovered ? hoverStyle : defaultStyle}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Icon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            {label}
        </Link>
    );
}
