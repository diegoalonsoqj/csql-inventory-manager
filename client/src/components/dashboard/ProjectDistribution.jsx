import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useChartColors } from '../../context/ThemeContext.jsx';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm">
      <p className="font-mono text-fg text-xs">{label}</p>
      <p className="text-accent font-medium">{payload[0].value} instancias</p>
    </div>
  );
};

export function ProjectDistribution({ data = [] }) {
  const colors = useChartColors();
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-fg/60 mb-4">Instancias por Proyecto</h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-fg/20 text-sm">Sin datos</div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(180, data.length * 32)}>
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="project_id"
              width={160}
              tick={{ fill: colors.tick, fontSize: 11, fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.cursor }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={entry.project_id} fill={colors.accentAlpha(Math.max(0.25, 0.9 - i * 0.07))} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
