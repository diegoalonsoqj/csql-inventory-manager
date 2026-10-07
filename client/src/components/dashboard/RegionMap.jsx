import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartColors } from '../../context/ThemeContext.jsx';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm">
      <p className="text-fg/60 text-xs">{label}</p>
      <p className="text-accent font-medium">{payload[0].value} instancias</p>
    </div>
  );
};

export function RegionMap({ data = [] }) {
  const colors = useChartColors();
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-fg/60 mb-4">Distribución por Región</h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-fg/20 text-sm">Sin datos</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ bottom: 24 }}>
            <XAxis
              dataKey="region"
              tick={{ fill: colors.tick, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              angle={-20}
              textAnchor="end"
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.cursor }} />
            <Bar dataKey="count" fill={colors.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
