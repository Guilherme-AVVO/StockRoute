// Página ADMIN de Usuários.
// Gerencia visualmente acessos de ADMIN e ESTOQUISTA com dados mockados.
import { useMemo, useState } from 'react';
import StatCard from '../../components/admin/StatCard.jsx';
import './AdminUsers.css';

// Dados temporários usados apenas para montar a interface.
// Quando as APIs estiverem prontas, substituir por chamadas reais ao backend.
const INITIAL_USERS = [
  { id: 1, name: 'Rafael Costa', email: 'rafael@motomadeiras.com', role: 'ADMIN', status: 'Ativo', lastAccess: 'Hoje 09:12', orders: '—' },
  { id: 2, name: 'João Estoquista', email: 'joao@motomadeiras.com', role: 'ESTOQUISTA', status: 'Ativo', lastAccess: 'Hoje 08:55', orders: '1 em separação' },
  { id: 3, name: 'Maria Estoquista', email: 'maria@motomadeiras.com', role: 'ESTOQUISTA', status: 'Ativo', lastAccess: 'Ontem', orders: '0' },
  { id: 4, name: 'Carlos Estoquista', email: 'carlos@motomadeiras.com', role: 'ESTOQUISTA', status: 'Inativo', lastAccess: '05/05/2026', orders: '0' },
  { id: 5, name: 'Admin Teste', email: 'admin@stockroute.com', role: 'ADMIN', status: 'Ativo', lastAccess: 'Agora', orders: '—' },
];

const FILTERS = ['Todos', 'ADMIN', 'ESTOQUISTA', 'Ativos', 'Inativos'];
const EMPTY_FORM = { name: '', email: '', password: '', role: 'ESTOQUISTA', active: true };

function RoleBadge({ role }) {
  return <span className={`users-role ${role.toLowerCase()}`}>{role}</span>;
}

function UserStatus({ status }) {
  return <span className={`users-status ${status === 'Ativo' ? 'active' : 'inactive'}`}>{status}</span>;
}

export default function AdminUsers() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Busca e filtros locais com base nos dados temporários.
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const byFilter =
        filter === 'Todos'
        || user.role === filter
        || (filter === 'Ativos' && user.status === 'Ativo')
        || (filter === 'Inativos' && user.status === 'Inativo');
      const bySearch = !term
        || user.name.toLowerCase().includes(term)
        || user.email.toLowerCase().includes(term);
      return byFilter && bySearch;
    });
  }, [filter, search, users]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal({ type: 'create' });
  }

  function openEdit(user) {
    setForm({ name: user.name, email: user.email, password: '', role: user.role, active: user.status === 'Ativo' });
    setFormError(null);
    setModal({ type: 'edit', user });
  }

  function closeModal() {
    setModal(null);
    setFormError(null);
  }

  function updateForm(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  // Modais e ações visuais: nada chama backend nesta etapa.
  function saveUser(event) {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim()) return setFormError('Nome é obrigatório.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setFormError('Informe um e-mail válido.');
    if (modal.type === 'create' && !form.password.trim()) return setFormError('Senha inicial é obrigatória.');

    if (modal.type === 'edit') {
      setUsers((current) => current.map((user) => (
        user.id === modal.user.id
          ? { ...user, name: form.name.trim(), role: form.role, status: form.active ? 'Ativo' : 'Inativo' }
          : user
      )));
      setFeedback('Usuário atualizado visualmente. Integração com backend será feita na próxima etapa.');
      return closeModal();
    }

    setUsers((current) => [{
      id: Date.now(),
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      status: form.active ? 'Ativo' : 'Inativo',
      lastAccess: 'Ainda não acessou',
      orders: form.role === 'ESTOQUISTA' ? '0' : '—',
    }, ...current]);
    setFeedback('Usuário criado visualmente. Integração com backend será feita na próxima etapa.');
    closeModal();
  }

  function toggleStatus(user) {
    const next = user.status === 'Ativo' ? 'Inativo' : 'Ativo';
    setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: next } : item));
    setFeedback(`Usuário ${next === 'Ativo' ? 'reativado' : 'desativado'} visualmente.`);
    closeModal();
  }

  function renderActions(user) {
    return (
      <div className="users-actions">
        <button type="button" onClick={() => setModal({ type: 'view', user })}>Ver</button>
        {user.status === 'Ativo' && <button type="button" onClick={() => openEdit(user)}>Editar</button>}
        {user.email !== 'admin@stockroute.com' && (
          <button type="button" onClick={() => setModal({ type: 'status', user })}>
            {user.status === 'Ativo' ? 'Desativar' : 'Reativar'}
          </button>
        )}
      </div>
    );
  }

  const stats = [
    { label: 'Usuários ativos', value: '4', description: 'Acessos liberados no sistema' },
    { label: 'Administradores', value: '1', description: 'Usuários com controle total' },
    { label: 'Estoquistas', value: '3', description: 'Usuários responsáveis pela separação' },
    { label: 'Inativos', value: '1', description: 'Acessos pausados' },
  ];

  return (
    <div className="users-page">
      {/* Integração com sidebar: renderizada pela seção ativa "users". */}
      <section className="hero users-hero">
        <div>
          <h1>Usuários</h1>
          <p>Gerencie os acessos de administradores e estoquistas do StockRoute.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" type="button" onClick={openCreate}>+ Novo usuário</button>
        </div>
      </section>

      {feedback && <div className="users-feedback" role="status">{feedback}</div>}

      <section className="users-stats-grid">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} icon={<span />} />)}
      </section>

      <section className="users-layout">
        <div className="users-main">
          <div className="card users-toolbar">
            <div className="users-filters">
              {FILTERS.map((item) => (
                <button key={item} className={`chip-filter${filter === item ? ' active' : ''}`} type="button" onClick={() => setFilter(item)}>
                  {item}
                </button>
              ))}
            </div>
            <label className="users-search">
              <span>⌕</span>
              <input placeholder="Buscar por nome ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
          </div>

          <div className="card users-table-card">
            {filteredUsers.length === 0 ? (
              <div className="users-empty">Nenhum usuário encontrado para esta busca.</div>
            ) : (
              <>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Usuário</th><th>E-mail</th><th>Papel</th><th>Status</th><th>Último acesso</th><th>Pedidos vinculados</th><th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td><strong>{user.name}</strong></td>
                        <td><span className="users-muted">{user.email}</span></td>
                        <td><RoleBadge role={user.role} /></td>
                        <td><UserStatus status={user.status} /></td>
                        <td><span className="users-muted">{user.lastAccess}</span></td>
                        <td><span className="pending-pill zero">{user.orders}</span></td>
                        <td>{renderActions(user)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="users-mobile-list">
                  {filteredUsers.map((user) => (
                    <article className="users-mobile-card" key={user.id}>
                      <div><strong>{user.name}</strong><span>{user.email}</span></div>
                      <div className="users-mobile-badges"><RoleBadge role={user.role} /><UserStatus status={user.status} /></div>
                      {renderActions(user)}
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="users-side">
          <div className="card users-side-card">
            <h2>Permissões</h2>
            <h3>ADMIN</h3>
            <ul><li>Cadastrar usuários</li><li>Gerenciar produtos</li><li>Upload DAV</li><li>Revisar pedidos</li><li>Publicar pedidos</li><li>Ver histórico completo</li></ul>
            <h3>ESTOQUISTA</h3>
            <ul><li>Ver pedidos disponíveis</li><li>Iniciar separação</li><li>Coletar item com foto</li><li>Marcar item não encontrado</li><li>Finalizar pedido</li></ul>
          </div>
          <div className="card users-side-card">
            <h2>Atividade recente</h2>
            <ul><li>João iniciou separação do DAV 0000000113108</li><li>Maria finalizou pedido 0000000113101</li><li>Rafael publicou o DAV 0000000113110</li></ul>
          </div>
        </aside>
      </section>

      {modal && (
        <div className="users-modal-overlay open" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="users-modal card">
            <div className="users-modal-head">
              <div>
                <h2>{modal.type === 'create' ? 'Novo usuário' : modal.type === 'edit' ? 'Editar usuário' : modal.type === 'status' ? 'Alterar status' : 'Ver usuário'}</h2>
                <p>{modal.user ? `${modal.user.name} · ${modal.user.email}` : 'A senha inicial deve ser trocada no primeiro acesso.'}</p>
              </div>
              <button className="modal-close" type="button" onClick={closeModal} aria-label="Fechar modal">×</button>
            </div>

            {(modal.type === 'create' || modal.type === 'edit') && (
              <form className="users-form" onSubmit={saveUser}>
                <label><span>Nome</span><input name="name" value={form.name} onChange={updateForm} /></label>
                <label><span>E-mail</span><input name="email" value={form.email} onChange={updateForm} disabled={modal.type === 'edit'} /></label>
                {modal.type === 'create' && <label><span>Senha inicial</span><input name="password" type="password" value={form.password} onChange={updateForm} /></label>}
                <label><span>Papel</span><select name="role" value={form.role} onChange={updateForm}><option>ADMIN</option><option>ESTOQUISTA</option></select></label>
                <label className="users-toggle"><input name="active" type="checkbox" checked={form.active} onChange={updateForm} /> Status ativo</label>
                {formError && <div className="users-form-error">{formError}</div>}
                <div className="users-modal-foot"><button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button><button className="btn btn-primary" type="submit">{modal.type === 'create' ? 'Criar usuário' : 'Salvar alterações'}</button></div>
              </form>
            )}

            {modal.type === 'view' && (
              <>
                <div className="users-detail-grid">
                  <span>Nome</span><strong>{modal.user.name}</strong>
                  <span>E-mail</span><strong>{modal.user.email}</strong>
                  <span>Papel</span><RoleBadge role={modal.user.role} />
                  <span>Status</span><UserStatus status={modal.user.status} />
                  <span>Último acesso</span><strong>{modal.user.lastAccess}</strong>
                  <span>Pedidos vinculados</span><strong>{modal.user.orders}</strong>
                  <p>Histórico recente: login realizado, ação administrativa registrada e permissões conferidas visualmente.</p>
                </div>
                <div className="users-modal-foot"><button className="btn btn-secondary" type="button" onClick={closeModal}>Fechar</button></div>
              </>
            )}

            {modal.type === 'status' && (
              <>
                <div className="users-confirm">Confirme a alteração de status para <strong>{modal.user.name}</strong>.</div>
                <div className="users-modal-foot"><button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button><button className="btn btn-primary" type="button" onClick={() => toggleStatus(modal.user)}>{modal.user.status === 'Ativo' ? 'Desativar' : 'Reativar'}</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
