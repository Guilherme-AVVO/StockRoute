import './PendingIssuesCard.css';

function ChevronIcon() {
  return (
    <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// stats: { ordersPending, ordersInProgress, ordersCompleted, ordersCancelled, totalProducts, activeIgnoredRules }
export default function PendingIssuesCard({ stats }) {
  const pending    = stats?.ordersPending    ?? 0;
  const inProgress = stats?.ordersInProgress ?? 0;
  const ignored    = stats?.activeIgnoredRules ?? 0;

  const issues = [
    {
      type: 'info',
      count: pending,
      text: pending === 1 ? 'DAV aguardando publicação' : 'DAVs aguardando publicação',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14m-7-7 7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      type: 'obs',
      count: inProgress,
      text: inProgress === 1 ? 'pedido em separação' : 'pedidos em separação',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ),
    },
    {
      type: 'muted',
      count: ignored,
      text: 'regras de ignorado ativas',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9 3h12v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="card side-card">
      <h3>Pendências importantes</h3>
      <div className="sub">O que precisa da sua decisão</div>
      <div className="pending-list">
        {issues.map((issue) => (
          <div key={issue.text} className="pending-item">
            <span className={`pending-icon ${issue.type}`}>{issue.icon}</span>
            <div>
              <div className="pending-count">{issue.count}</div>
              <div className="pending-text">{issue.text}</div>
            </div>
            <ChevronIcon />
          </div>
        ))}
      </div>
    </div>
  );
}
