// Página ADMIN de Configurações.
// Centraliza preferências visuais e parâmetros operacionais.
import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import './AdminSettings.css';

export default function AdminSettings({ onNavigate }) {
  // Toggles visuais locais; não persistem no backend nesta etapa.
  const [toggles, setToggles] = useState({
    shortcuts: true,
    warnings: true,
    requirePhoto: true,
    requireReason: true,
  });
  const [modal, setModal] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => res.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  function toggle(name) {
    if (name === 'requireReason' && toggles.requireReason) {
      setFeedback('Essa regra é crítica para auditoria e não deve ser desativada sem ajuste no backend.');
      return;
    }
    setToggles((current) => ({ ...current, [name]: !current[name] }));
  }

  return (
    <div className="settings-page">
      {/* Integração com sidebar: renderizada pela seção ativa "settings". */}
      <section className="hero settings-hero">
        <div>
          <h1>Configurações</h1>
          <p>Ajuste preferências administrativas e visualize parâmetros operacionais do StockRoute.</p>
        </div>
      </section>

      {feedback && <div className="settings-feedback" role="status">{feedback}</div>}

      <section className="settings-layout">
        <div className="settings-grid">
          <div className="card settings-card">
            <h2>Sistema</h2>
            <div className="settings-kv"><span>Nome do sistema</span><strong>StockRoute</strong><span>Empresa</span><strong>Moto Madeiras</strong><span>Ambiente</span><strong>Teste</strong><span>Versão</span><strong>MVP inicial</strong></div>
            <Toggle label="Mostrar atalhos na dashboard" active={toggles.shortcuts} onClick={() => toggle('shortcuts')} />
            <Toggle label="Exibir avisos operacionais" active={toggles.warnings} onClick={() => toggle('warnings')} />
          </div>

          <div className="card settings-card">
            <h2>Upload DAV</h2>
            <ul><li>Tipo aceito: PDF</li><li>Tamanho máximo: 10 MB</li><li>Parser atual: DAV padrão Moto Madeiras</li><li>PDFs escaneados: Não suportados no MVP</li><li>Revisão obrigatória antes da publicação: Sim</li></ul>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setModal('upload')}>Ver regras de upload</button>
          </div>

          <div className="card settings-card">
            <h2>Picking</h2>
            <ul><li>Foto obrigatória para item coletado</li><li>Item não encontrado exige motivo</li><li>Pedido com item não encontrado vai para OBSERVAÇÃO</li><li>Apenas itens publicados aparecem para o estoquista</li><li>Itens ignorados não aparecem no picking</li></ul>
            <Toggle label="Exigir foto na coleta" active={toggles.requirePhoto} onClick={() => toggle('requirePhoto')} />
            <Toggle label="Exigir motivo no item não encontrado" active={toggles.requireReason} onClick={() => toggle('requireReason')} />
          </div>

          <div className="card settings-card">
            <h2>Segurança</h2>
            <ul><li>Autenticação: JWT</li><li>Perfis ativos: ADMIN e ESTOQUISTA</li><li>Sessão protegida por token</li><li>Troca de senha inicial: recomendada</li><li>Rate limit no login: ativo</li></ul>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setModal('security')}>Revisar segurança</button>
          </div>

          <div className="card settings-card">
            <h2>Itens ignorados</h2>
            <ul><li>Regras ativas: {stats?.activeIgnoredRules ?? '—'}</li><li>Itens ignorados não aparecem no picking</li><li>Itens ignorados continuam no histórico</li><li>Toda regra deve ter motivo</li><li>Auditoria obrigatória</li></ul>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => onNavigate?.('ignoredItems')}>Gerenciar itens ignorados</button>
          </div>

          <div className="card settings-card">
            <h2>Usuários e permissões</h2>
            <ul><li>Perfis disponíveis: ADMIN e ESTOQUISTA</li><li>ADMIN gerencia pedidos, produtos, revisões e usuários</li><li>ESTOQUISTA separa pedidos publicados</li><li>Usuários inativos não acessam o sistema</li></ul>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => onNavigate?.('users')}>Gerenciar usuários</button>
          </div>

          <div className="card settings-card settings-checklist">
            <h2>Checklist de produção</h2>
            <ul><li>FRONTEND_URL configurada</li><li>VITE_API_URL configurada</li><li>PostgreSQL online conectado</li><li>JWT_SECRET de produção definido</li><li>.env não enviado ao GitHub</li></ul>
          </div>
        </div>

        <aside className="card settings-side">
          <h2>Indicadores reais</h2>
          <div className="settings-status-row"><span>Pedidos pendentes</span><strong>{stats?.ordersPending ?? '—'}</strong></div>
          <div className="settings-status-row"><span>Em separação</span><strong>{stats?.ordersInProgress ?? '—'}</strong></div>
          <div className="settings-status-row"><span>Concluídos</span><strong>{stats?.ordersCompleted ?? '—'}</strong></div>
          <div className="settings-status-row"><span>Produtos</span><strong>{stats?.totalProducts ?? '—'}</strong></div>
          <div className="settings-status-row"><span>Regras ativas</span><strong>{stats?.activeIgnoredRules ?? '—'}</strong></div>
        </aside>
      </section>

      {modal && (
        <div className="settings-modal-overlay open" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="settings-modal card">
            <div className="settings-modal-head"><h2>{modal === 'upload' ? 'Regras de upload' : 'Checklist de segurança'}</h2><button className="modal-close" type="button" onClick={() => setModal(null)}>×</button></div>
            <div className="settings-modal-body">
              {modal === 'upload' ? (
                <ul><li>Apenas arquivos PDF até 10 MB.</li><li>PDFs escaneados podem exigir revisão manual.</li><li>Todo DAV passa por revisão ADMIN antes da publicação.</li></ul>
              ) : (
                <ul><li>JWT_SECRET configurado</li><li>CORS restrito</li><li>Senhas com bcrypt</li><li>Tokens não exibidos no frontend</li><li>.env fora do GitHub</li></ul>
              )}
            </div>
            <div className="settings-modal-foot"><button className="btn btn-secondary" type="button" onClick={() => setModal(null)}>Fechar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, active, onClick }) {
  return (
    <button className={`settings-toggle${active ? ' active' : ''}`} type="button" onClick={onClick}>
      <span>{label}</span><i />
    </button>
  );
}
