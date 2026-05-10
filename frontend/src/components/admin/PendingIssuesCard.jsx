// Painel lateral de pendências importantes — itens que exigem decisão do ADMIN.
// TODO: substituir dados mockados por chamada real à API.
import './PendingIssuesCard.css';

// Chevron reutilizado nos itens
function ChevronIcon() {
  return (
    <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Dados mockados — integração real pendente
const MOCK_ISSUES = [
  {
    type: 'warn',
    count: 3,
    text: 'itens sem vínculo com catálogo',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 9v4M12 17h.01M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    type: 'info',
    count: 2,
    text: 'DAVs aguardando publicação',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M5 12h14m-7-7 7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    type: 'obs',
    count: 1,
    text: 'pedido em observação',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type: 'muted',
    count: 5,
    text: 'itens DAV sugeridos para ignorar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 3h12v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function PendingIssuesCard() {
  return (
    <div className="card side-card">
      <h3>Pendências importantes</h3>
      <div className="sub">O que precisa da sua decisão</div>
      <div className="pending-list">
        {MOCK_ISSUES.map((issue, i) => (
          <div key={i} className="pending-item">
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
