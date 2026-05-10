// Card de KPI da dashboard ADMIN.
// Recebe ícone (SVG como elemento React), valor, label, descrição e tendência.
import './StatCard.css';

export default function StatCard({ icon, value, label, description, trend, trendDown = false, iconStyle }) {
  return (
    <div className="stat-card">
      <div className="stat-head">
        <span className="stat-icon" style={iconStyle}>{icon}</span>
        {trend != null && (
          <span className={`stat-trend${trendDown ? ' down' : ''}`}>
            {trendDown ? '↓' : '↑'} {Math.abs(trend)}
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-desc">{description}</div>
    </div>
  );
}
