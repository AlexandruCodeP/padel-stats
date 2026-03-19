import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Search, Users, LayoutDashboard, TrendingUp, GitCompare, Moon, Sun, Activity, Home, CalendarArrowUp, LogOut, ChevronDown, Globe, Clock, Award, Repeat } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const SIDEBAR_BG = '#0F172A';
const VOLT = '#CCFF00';
const INACTIVE = '#64748B';
const HOVER_COLOR = '#CBD5E1';
const HOVER_BG = 'rgba(255,255,255,0.06)';

// Navigation structure with dropdowns
const navItems = [
    { type: 'link', to: '/classement', label: 'Classement', icon: BarChart3 },
    { type: 'link', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
        type: 'dropdown', label: 'Statistiques', icon: TrendingUp, key: 'stats',
        children: [
            { to: '/evolution', label: 'Evolution', icon: TrendingUp },
            { to: '/nationalites', label: 'Nationalites', icon: Globe },
            { to: '/age', label: 'Age', icon: Clock },
            { to: '/points', label: 'Points', icon: Award },
            { to: '/ligues', label: 'Ligues', icon: Users },
            { to: '/frequence', label: 'Frequence', icon: Repeat },
        ],
    },
    {
        type: 'dropdown', label: 'Comparer', icon: GitCompare, key: 'compare',
        children: [
            { to: '/comparateur', label: 'Joueurs', icon: GitCompare },
            { to: '/comparaison-mois', label: 'Mois', icon: CalendarArrowUp },
        ],
    },
    { type: 'link', to: '/recherche', label: 'Recherche', icon: Search },
];

// All routes that belong to each dropdown (for active state)
const dropdownRoutes = {
    stats: ['/evolution', '/nationalites', '/age', '/points', '/ligues', '/frequence'],
    compare: ['/comparateur', '/comparaison-mois'],
};

// Mobile bottom bar items (flat, limited)
const mobileLinks = [
    { to: '/classement', label: 'Classement', icon: BarChart3 },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/evolution', label: 'Stats', icon: TrendingUp },
    { to: '/comparateur', label: 'Comparer', icon: GitCompare },
    { to: '/recherche', label: 'Recherche', icon: Search },
];

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

    // Which dropdowns are open
    const [openMenus, setOpenMenus] = useState(() => {
        // Auto-open the dropdown that contains the current route
        const initial = {};
        for (const [key, routes] of Object.entries(dropdownRoutes)) {
            if (routes.includes(location.pathname)) initial[key] = true;
        }
        return initial;
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

    // Auto-open dropdown when navigating to a child route
    useEffect(() => {
        for (const [key, routes] of Object.entries(dropdownRoutes)) {
            if (routes.includes(location.pathname)) {
                setOpenMenus(prev => ({ ...prev, [key]: true }));
            }
        }
    }, [location.pathname]);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    function toggleMenu(key) {
        setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
    }

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
                            <div className="font-bold text-base leading-tight tracking-tight" style={{ color: '#F8FAFC' }}>
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
                    {navItems.map((item) => {
                        if (item.type === 'link') {
                            return (
                                <SidebarLink
                                    key={item.to}
                                    to={item.to}
                                    label={item.label}
                                    Icon={item.icon}
                                    active={location.pathname === item.to}
                                />
                            );
                        }

                        // Dropdown
                        const isOpen = openMenus[item.key];
                        const hasActiveChild = dropdownRoutes[item.key]?.includes(location.pathname);

                        return (
                            <div key={item.key}>
                                <DropdownToggle
                                    label={item.label}
                                    Icon={item.icon}
                                    isOpen={isOpen}
                                    hasActiveChild={hasActiveChild}
                                    onClick={() => toggleMenu(item.key)}
                                />
                                {/* Children with animation */}
                                <div
                                    className="overflow-hidden transition-all duration-200 ease-in-out"
                                    style={{
                                        maxHeight: isOpen ? `${item.children.length * 44}px` : '0px',
                                        opacity: isOpen ? 1 : 0,
                                    }}
                                >
                                    <div className="ml-3 pl-3 space-y-0.5 py-1" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                                        {item.children.map((child) => (
                                            <SidebarLink
                                                key={child.to}
                                                to={child.to}
                                                label={child.label}
                                                Icon={child.icon}
                                                active={location.pathname === child.to}
                                                compact
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
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
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Retour a l'accueil</span>
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
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                                style={{ backgroundColor: VOLT, color: '#020617' }}
                            >
                                {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate" style={{ color: '#E2E8F0' }}>
                                    {user.name}
                                </div>
                                <div className="text-xs truncate" style={{ color: INACTIVE }}>
                                    {user.email}
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                title="Se deconnecter"
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
                    {mobileLinks.map(({ to, label, icon: Icon }) => {
                        const active = location.pathname === to ||
                            (to === '/evolution' && dropdownRoutes.stats.includes(location.pathname)) ||
                            (to === '/comparateur' && dropdownRoutes.compare.includes(location.pathname));
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
                        <span style={{ fontSize: '9px' }} className="font-medium">Theme</span>
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

/* ── DropdownToggle sub-component ── */
function DropdownToggle({ label, Icon, isOpen, hasActiveChild, onClick }) {
    const [hovered, setHovered] = useState(false);

    const baseStyle = {
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px',
        borderRadius: '12px',
        fontSize: '14px', fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        width: '100%',
        border: 'none',
        background: 'none',
    };

    const style = hasActiveChild
        ? { ...baseStyle, backgroundColor: 'rgba(204, 255, 0, 0.06)', color: VOLT }
        : hovered
            ? { ...baseStyle, backgroundColor: HOVER_BG, color: HOVER_COLOR }
            : { ...baseStyle, color: INACTIVE };

    return (
        <button
            style={style}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Icon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span className="flex-1 text-left">{label}</span>
            <ChevronDown
                style={{
                    width: '14px', height: '14px', flexShrink: 0,
                    transition: 'transform 0.2s ease',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    opacity: 0.6,
                }}
            />
        </button>
    );
}

/* ── SidebarLink sub-component ── */
function SidebarLink({ to, label, Icon, active, compact }) {
    const [hovered, setHovered] = useState(false);

    const bgColor = active
        ? 'rgba(204, 255, 0, 0.1)'
        : hovered ? HOVER_BG : 'transparent';
    const textColor = active ? VOLT : hovered ? HOVER_COLOR : INACTIVE;

    return (
        <Link
            to={to}
            className="relative no-underline"
            style={{
                display: 'flex', alignItems: 'center',
                gap: compact ? '8px' : '10px',
                padding: compact ? '8px 10px' : '10px 12px',
                borderRadius: '12px',
                fontSize: compact ? '13px' : '14px',
                fontWeight: '500',
                transition: 'all 0.15s ease',
                backgroundColor: bgColor,
                color: textColor,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {active && !compact && (
                <span style={{
                    position: 'absolute', left: 0, top: '6px', bottom: '6px',
                    width: '4px', borderRadius: '0 4px 4px 0',
                    backgroundColor: VOLT,
                }} />
            )}
            <Icon style={{ width: compact ? '14px' : '16px', height: compact ? '14px' : '16px', flexShrink: 0 }} />
            {label}
        </Link>
    );
}
