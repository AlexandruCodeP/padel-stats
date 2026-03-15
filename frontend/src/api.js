const BASE = import.meta.env.VITE_API_BASE || '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function fetchJSON(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${url}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Session expirée');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authRegister = (name, email, password) =>
  fetchJSON('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

export const authLogin = (email, password) =>
  fetchJSON('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const getMe = () => fetchJSON('/auth/me');

// ── Base ──────────────────────────────────────────────────────────────────────

export const getStats = () => fetchJSON('/stats');
export const getMois = () => fetchJSON('/mois');
export const getClassement = (mois, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetchJSON(`/classement/${mois}?${q}`);
};
export const getClassementExport = (mois, genre) => {
    const params = new URLSearchParams();
    if (genre) params.set('genre', genre);
    return fetchJSON(`/classement/${mois}/export?${params}`);
};
export const getJoueur = (id) => fetchJSON(`/joueur/${id}`);
export const rechercher = (q, genre, limit = 20) => {
    const params = new URLSearchParams({ q, limit });
    if (genre) params.set('genre', genre);
    return fetchJSON(`/recherche?${params}`);
};
export const getTop = (genre, limit = 10) => fetchJSON(`/top/${genre}?limit=${limit}`);
export const getComparaison = (id1, id2) => fetchJSON(`/comparaison?joueur1=${id1}&joueur2=${id2}`);
export const getLigues = (mois) => fetchJSON(`/ligues${mois ? `?mois=${mois}` : ''}`);

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboardOverview = (mois, genre) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/dashboard/overview?${params}`);
};
export const getDashboardProgressions = (mois, genre, limit = 10) => {
    const params = new URLSearchParams({ limit });
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/dashboard/progressions?${params}`);
};
export const getDashboardChutes = (mois, genre, limit = 10) => {
    const params = new URLSearchParams({ limit });
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/dashboard/chutes?${params}`);
};
export const getDashboardEvolution = (genre) => {
    const params = new URLSearchParams();
    if (genre) params.set('genre', genre);
    return fetchJSON(`/dashboard/evolution-mensuelle?${params}`);
};
export const getDashboardAges = (mois, genre) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/dashboard/ages?${params}`);
};
export const getDashboardLigues = (mois, genre) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/dashboard/ligues?${params}`);
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getAnalyticsNumeroUn = (genre) => {
    const params = new URLSearchParams();
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/numero-un?${params}`);
};
export const getAnalyticsDifficulte = (mois, genre) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/difficulte-progression?${params}`);
};
export const getAnalyticsInflation = (genre) => {
    const params = new URLSearchParams();
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/inflation-points?${params}`);
};
export const getAnalyticsNationalites = (mois, top, genre) => {
    const params = new URLSearchParams({ top });
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/nationalites-par-niveau?${params}`);
};
export const getAnalyticsAge = (mois, genre) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/age-par-niveau?${params}`);
};
export const getAnalyticsFrequence = (mois, genre) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/frequence-tournois?${params}`);
};
export const getAnalyticsProfil = (mois, top, genre) => {
    const params = new URLSearchParams({ top });
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/profil-type?${params}`);
};
export const getAnalyticsCompetitivite = (mois, genre) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/competitivite?${params}`);
};
export const getAnalyticsFeminine = () => fetchJSON('/analytics/participation-feminine');
export const getAnalyticsPredictions = (joueurId) => fetchJSON(`/analytics/predictions/${joueurId}`);
export const getAnalyticsRecords = (mois, genre) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/records?${params}`);
};
