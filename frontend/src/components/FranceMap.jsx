import { useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

const GEO_URL = '/regions-france.geojson';

/* FFT ligue name → GeoJSON region "nom" */
const LIGUE_TO_NOM = {
  'ILE DE FRANCE':              'Île-de-France',
  'CENTRE VAL DE LOIRE':        'Centre-Val de Loire',
  'BOURGOGNE FRANCHE COMTE':    'Bourgogne-Franche-Comté',
  'NORMANDIE':                  'Normandie',
  'HAUTS DE FRANCE':            'Hauts-de-France',
  'GRAND EST':                  'Grand Est',
  'PAYS DE LA LOIRE':           'Pays de la Loire',
  'BRETAGNE':                   'Bretagne',
  'NOUVELLE AQUITAINE':         'Nouvelle-Aquitaine',
  'OCCITANIE':                  'Occitanie',
  'AUVERGNE RHONE-ALPES':       'Auvergne-Rhône-Alpes',
  "PROVENCE ALPES COTE D'AZUR": "Provence-Alpes-Côte d'Azur",
  'CORSE':                      'Corse',
};

const ABBR = {
  'Île-de-France':                'IDF',
  'Centre-Val de Loire':          'CVL',
  'Bourgogne-Franche-Comté':      'BFC',
  'Normandie':                    'NOR',
  'Hauts-de-France':              'HDF',
  'Grand Est':                    'GE',
  'Pays de la Loire':             'PDL',
  'Bretagne':                     'BRE',
  'Nouvelle-Aquitaine':           'N-AQ',
  'Occitanie':                    'OCC',
  'Auvergne-Rhône-Alpes':         'ARA',
  "Provence-Alpes-Côte d'Azur":   'PACA',
  'Corse':                        'COR',
};

export default function FranceMap({ ligues = [], onRegionClick }) {
  const [hovered, setHovered]   = useState(null);   // region nom
  const [tooltip, setTooltip]   = useState({ show: false, x: 0, y: 0 });

  /* Build lookup nom → ligue data */
  const byNom = {};
  ligues.forEach(l => {
    const nom = LIGUE_TO_NOM[l.ligue];
    if (nom) byNom[nom] = l;
  });

  const maxTotal = Math.max(...ligues.map(l => l.total), 1);

  const getFill = (nom, isHov) => {
    const d = byNom[nom];
    if (!d) return isHov ? '#c7d9ec' : '#dde8f4';
    const t = d.total / maxTotal;
    // Interpolate from light blue (low count) to dark blue (high count)
    const r = Math.round(221 - t * 207);
    const g = Math.round(232 - t * 161);
    const b = Math.round(244 - t * 73);
    if (isHov) return `rgb(${Math.max(r - 20, 0)},${Math.max(g - 20, 0)},${Math.max(b - 20, 0)})`;
    return `rgb(${r},${g},${b})`;
  };

  const hoveredData = hovered ? byNom[hovered] : null;

  return (
    <div
      className="relative select-none"
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip(p => ({ ...p, x: e.clientX - rect.left, y: e.clientY - rect.top }));
      }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [2.3, 46.5], scale: 2550 }}
        width={700}
        height={700}
        style={{ width: '100%', height: 'auto', maxHeight: '520px' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const nom   = geo.properties.nom;
              const isHov = hovered === nom;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={() => { setHovered(nom); setTooltip(p => ({ ...p, show: true })); }}
                  onMouseLeave={() => { setHovered(null); setTooltip(p => ({ ...p, show: false })); }}
                  onClick={() => onRegionClick?.(nom, byNom[nom])}
                  style={{
                    default: {
                      fill: getFill(nom, false),
                      stroke: 'var(--color-card, #fff)',
                      strokeWidth: 1,
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'fill 0.15s',
                    },
                    hover: {
                      fill: getFill(nom, true),
                      stroke: '#0047AB',
                      strokeWidth: 1.8,
                      outline: 'none',
                      cursor: 'pointer',
                      filter: 'drop-shadow(0 2px 6px rgba(0,71,171,0.3))',
                    },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip.show && hoveredData && hovered && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            left: Math.min(tooltip.x + 14, 490),
            top: Math.max(tooltip.y - 96, 4),
            minWidth: '190px',
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '12px 16px',
            boxShadow: '0 20px 30px rgba(0,0,0,0.45)',
          }}
        >
          <div className="font-bold text-sm text-white mb-2">{hovered}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-slate-400">Total</span>
            <span className="font-mono font-semibold text-right text-white">
              {hoveredData.total?.toLocaleString('fr-FR')}
            </span>
            <span className="text-slate-400">Hommes</span>
            <span className="font-mono font-semibold text-right text-sky-400">
              {hoveredData.hommes?.toLocaleString('fr-FR')}
            </span>
            <span className="text-slate-400">Femmes</span>
            <span className="font-mono font-semibold text-right text-pink-400">
              {hoveredData.femmes?.toLocaleString('fr-FR')}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 px-1">
        <span className="text-xs text-text-secondary">Moins de joueurs</span>
        <div className="flex-1 h-2 rounded-full" style={{
          background: 'linear-gradient(to right, rgb(221,232,244), rgb(14,71,171))',
        }} />
        <span className="text-xs text-text-secondary">Plus de joueurs</span>
      </div>
    </div>
  );
}
