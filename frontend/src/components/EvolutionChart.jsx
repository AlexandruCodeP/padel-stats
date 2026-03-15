import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MOIS_FR = {
    '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Juin',
    '07': 'Juil', '08': 'Aoû', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
};

function formatMois(m) {
    if (!m) return '';
    const [y, mo] = m.split('-');
    return `${MOIS_FR[mo] || mo} ${y}`;
}

/* ── Dark custom tooltip ── */
const DarkTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            backgroundColor: '#0F172A',
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)',
            border: 'none',
            minWidth: '140px',
        }}>
            <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '6px', fontWeight: '500' }}>
                {formatMois(label)}
            </div>
            {payload.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.color, flexShrink: 0 }} />
                    <span style={{ color: '#94A3B8', fontSize: '12px' }}>{p.name}:</span>
                    <span style={{ color: '#F8FAFC', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
                        {p.value?.toLocaleString('fr-FR')}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default function EvolutionChart({
    data,
    lines = [{ key: 'rang', name: 'Rang', color: '#38BDF8' }],
    height = 300,
    invertY = false
}) {
    if (!data || data.length === 0) {
        return <div className="text-text-secondary text-sm text-center py-8">Pas de données</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 8, right: 20, bottom: 5, left: 0 }}>
                {/* No CartesianGrid per spec */}
                <XAxis
                    dataKey="mois"
                    tickFormatter={formatMois}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                />
                <YAxis
                    reversed={invertY}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                {lines.map((l) => (
                    <Line
                        key={l.key}
                        type="monotone"
                        dataKey={l.key}
                        name={l.name}
                        stroke={l.color}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: l.color, strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
