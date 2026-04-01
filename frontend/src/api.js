const BASE = import.meta.env.VITE_API_BASE || '/api';

async function fetchJSON(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const res = await fetch(`${BASE}${url}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

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
export const getClubs = (mois, genre, search) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    if (search) params.set('search', search);
    return fetchJSON(`/clubs?${params}`);
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboardOverview = (mois, genre) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/dashboard/overview?${params}`);
};
export const getDashboardProgressions = (mois, genre, limit = 10, rang_max = null) => {
    const params = new URLSearchParams({ limit });
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    if (rang_max) params.set('rang_max', rang_max);
    return fetchJSON(`/dashboard/progressions?${params}`);
};
export const getDashboardChutes = (mois, genre, limit = 10, rang_max = null) => {
    const params = new URLSearchParams({ limit });
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    if (rang_max) params.set('rang_max', rang_max);
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
export const getAnalyticsParticipationsMensuelles = (genre) => {
    const params = new URLSearchParams();
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/participations-mensuelles?${params}`);
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
export const getAnalyticsEvolutionNationalites = (genre, top_pays = 5) => {
    const params = new URLSearchParams({ top_pays });
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/evolution-nationalites?${params}`);
};
export const getAnalyticsRangPoints = (mois, genre) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/rang-points?${params}`);
};
export const getAnalyticsRegionTableau = (mois, genre) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/region-tableau?${params}`);
};
export const getAnalyticsEvolutionAssimiles = (genre) => {
    const params = new URLSearchParams();
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/evolution-assimiles?${params}`);
};
export const getAnalyticsEvolutionAgeMoyen = () => fetchJSON('/analytics/evolution-age-moyen');
export const getAnalyticsEvolutionLigues = (genre) => {
    const params = new URLSearchParams();
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/evolution-ligues?${params}`);
};
export const getAnalyticsEvolutionTop100ParLigue = (genre, top_n = 100) => {
    const params = new URLSearchParams({ top_n });
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/evolution-top100-par-ligue?${params}`);
};
export const getAnalyticsEvolutionMoins18ParLigue = (genre) => {
    const params = new URLSearchParams();
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/evolution-moins18-par-ligue?${params}`);
};
export const getAnalyticsEvolutionAssimilesParLigue = (genre) => {
    const params = new URLSearchParams();
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/evolution-assimiles-par-ligue?${params}`);
};
export const getAnalyticsEvolutionEtrangersTop100 = () => fetchJSON('/analytics/evolution-etrangers-top100');
export const getAnalyticsClubsTableau = (mois, genre) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/clubs-tableau?${params}`);
};
export const getAnalyticsEvolutionTopClubs = (genre, top_n = 20) => {
    const params = new URLSearchParams({ top_n });
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/evolution-top-clubs?${params}`);
};
export const getAnalyticsClubsParLigue = (mois, genre) => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', mois);
    if (genre) params.set('genre', genre);
    return fetchJSON(`/analytics/clubs-par-ligue?${params}`);
};
