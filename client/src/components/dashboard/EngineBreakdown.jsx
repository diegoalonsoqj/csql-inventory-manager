import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useChartColors } from '../../context/ThemeContext.jsx';
import { ENGINE_COLORS } from '../../lib/utils.js';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm">
      <p className="font-medium text-fg">{payload[0].name}</p>
      <p className="text-fg/60">{payload[0].value} instancias</p>
    </div>
  );
};

export function EngineBreakdown({ data = [] }) {
  const colors = useChartColors();
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-fg/60 mb-4">Engine Distribution</h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-fg/20 text-sm">Sin datos</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="engine" cx="50%" cy="50%" innerRadius={55} outerRadius={80} stroke={colors.sliceStroke}>
              {data.map((entry) => (
                <Cell key={entry.engine} fill={ENGINE_COLORS[entry.engine] ?? '#6b7280'} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-fg/60 text-xs">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
      <p className="text-center text-xs text-fg/30 mt-1">{total} total</p>
    </div>
  );
}
