// Página ADMIN de Usuários.
// Todos os dados vêm da API real; não há fallback para dados mockados.
import { useEffect, useMemo, useState } from 'react';
import StatCard from '../../components/admin/StatCard.jsx';
import {
  createUser,
  getUser,
  listUsers,
  setUserStatus,
  updateUser,
} from '../../services/userService.js';
import './AdminUsers.css';

const FILTERS = ['Todos', 'ADMIN', 'ESTOQUISTA', 'Ativos', 'Inativos'];
const EMPTY_FORM = { name: '', email: '', password: '', role: 'ESTOQUISTA', isActive: true };

function RoleBadge({ role }) {
  return <span className={`users-role ${role.toLowerCase()}`}>{role}</span>;
}

function UserStatus({ isActive }) {
  const label = isActive ? 'Ativo' : 'Inativo';
  return <span className={`users-status ${isActive ? 'active' : 'inactive'}`}>{label}</span>;
}

function formatDate(value) {
  if (!value) return 'Sem registro';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function friendlyError(error) {
  if (error?.status === 401) return 'Sessão expirada. Faça login novamente.';
  if (error?.status === 403) return 'Você não tem permissão para gerenciar usuários.';
  return error?.message || 'Não foi possível concluir a operação.';
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (error) {
      setLoadError(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const byFilter =
        filter === 'Todos'
        || user.role === filter
        || (filter === 'Ativos' && user.isActive)
        || (filter === 'Inativos' && !user.isActive);
      const bySearch = !term
        || user.name.toLowerCase().includes(term)
        || user.email.toLowerCase().includes(term);
      return byFilter && bySearch;
    });
  }, [filter, search, users]);

  const stats = useMemo(() => [
    { label: 'Usuários ativos', value: users.filter((user) => user.isActive).length, description: 'Acessos liberados no sistema' },
    { label: 'Administradores', value: users.filter((user) => user.role === 'ADMIN').length, description: 'Usuários com controle total' },
    { label: 'Estoquistas', value: users.filter((user) => user.role === 'ESTOQUISTA').length, description: 'Usuários responsáveis pela separação' },
    { label: 'Inativos', value: users.filter((user) => !user.isActive).length, description: 'Acessos pausados' },
  ], [users]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setFeedback(null);
    setModal({ type: 'create' });
  }

  function openEdit(user) {
    setForm({ name: user.name, email: user.email, password: '', role: user.role, isActive: user.isActive });
    setFormError(null);
    setFeedback(null);
    setModal({ type: 'edit', user });
  }

  async function openView(user) {
    setFormError(null);
    setFeedback(null);
    setModal({ type: 'view', user, loading: true });
    try {
      const detail = await getUser(user.id);
      setModal({ type: 'view', user: detail, loading: false });
    } catch (error) {
      setModal({ type: 'view', user, loading: false, error: friendlyError(error) });
    }
  }

  function closeModal() {
    setModal(null);
    setFormError(null);
    setSaving(false);
  }

  function updateForm(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  async function saveUser(event) {
    event.preventDefault();
    setFormError(null);
    setFeedback(null);

    if (!form.name.trim()) return setFormError('Nome é obrigatório.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setFormError('Informe um e-mail válido.');
    if (!form.role) return setFormError('Papel é obrigatório.');
    if (modal.type === 'create' && !form.password.trim()) return setFormError('Senha inicial é obrigatória.');

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        isActive: form.isActive,
      };

      if (modal.type === 'create') {
        await createUser({ ...payload, password: form.password });
        setFeedback('Usuário criado com sucesso.');
      } else {
        await updateUser(modal.user.id, payload);
        setFeedback('Usuário atualizado com sucesso.');
      }

      await loadUsers();
      closeModal();
    } catch (error) {
      setFormError(friendlyError(error));
    } finally {
      setSaving(false);
    }
  }

  async function confirmStatusChange(user) {
    setSaving(true);
    setFormError(null);
    try {
      const result = await setUserStatus(user.id, !user.isActive);
      setFeedback(result.message);
      await loadUsers();
      closeModal();
    } catch (error) {
      setFormError(friendlyError(error));
    } finally {
      setSaving(false);
    }
  }

  function renderActions(user) {
    return (
      <div className="users-actions">
        <button type="button" onClick={() => openView(user)}>Ver</button>
        <button type="button" onClick={() => openEdit(user)}>Editar</button>
        <button type="button" onClick={() => setModal({ type: 'status', user })}>
          {user.isActive ? 'Desativar' : 'Reativar'}
        </button>
      </div>
    );
  }

  return (
    <div className="users-page">
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
      {loadError && <div className="users-error" role="alert">{loadError}</div>}

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
            {loading ? (
              <div className="users-empty">Carregando usuários...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="users-empty">{users.length === 0 ? 'Nenhum usuário cadastrado.' : 'Nenhum usuário encontrado para esta busca.'}</div>
            ) : (
              <>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Usuário</th><th>E-mail</th><th>Papel</th><th>Status</th><th>Último acesso</th><th>Criado em</th><th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td><strong>{user.name}</strong></td>
                        <td><span className="users-muted">{user.email}</span></td>
                        <td><RoleBadge role={user.role} /></td>
                        <td><UserStatus isActive={user.isActive} /></td>
                        <td><span className="users-muted">{user.lastAccessAt ? formatDate(user.lastAccessAt) : 'Sem registro de acesso'}</span></td>
                        <td><span className="users-muted">{formatDate(user.createdAt)}</span></td>
                        <td>{renderActions(user)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="users-mobile-list">
                  {filteredUsers.map((user) => (
                    <article className="users-mobile-card" key={user.id}>
                      <div><strong>{user.name}</strong><span>{user.email}</span></div>
                      <div className="users-mobile-badges"><RoleBadge role={user.role} /><UserStatus isActive={user.isActive} /></div>
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
            <p className="users-side-empty">Sem histórico real de atividade para exibir aqui.</p>
          </div>
        </aside>
      </section>

      {modal && (
        <div className="users-modal-overlay open" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="users-modal card">
            <div className="users-modal-head">
              <div>
                <h2>{modal.type === 'create' ? 'Novo usuário' : modal.type === 'edit' ? 'Editar usuário' : modal.type === 'status' ? 'Alterar status' : 'Ver usuário'}</h2>
                <p>{modal.user ? `${modal.user.name} · ${modal.user.email}` : 'Informe os dados de acesso do novo usuário.'}</p>
              </div>
              <button className="modal-close" type="button" onClick={closeModal} aria-label="Fechar modal">×</button>
            </div>

            {(modal.type === 'create' || modal.type === 'edit') && (
              <form className="users-form" onSubmit={saveUser}>
                <label><span>Nome</span><input name="name" value={form.name} onChange={updateForm} /></label>
                <label><span>E-mail</span><input name="email" value={form.email} onChange={updateForm} /></label>
                {modal.type === 'create' && <label><span>Senha inicial</span><input name="password" type="password" value={form.password} onChange={updateForm} /></label>}
                <label><span>Papel</span><select name="role" value={form.role} onChange={updateForm}><option>ADMIN</option><option>ESTOQUISTA</option></select></label>
                <label className="users-toggle"><input name="isActive" type="checkbox" checked={form.isActive} onChange={updateForm} /> Status ativo</label>
                {formError && <div className="users-form-error">{formError}</div>}
                <div className="users-modal-foot"><button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Salvando...' : modal.type === 'create' ? 'Criar usuário' : 'Salvar alterações'}</button></div>
              </form>
            )}

            {modal.type === 'view' && (
              <>
                <div className="users-detail-grid">
                  {modal.loading ? (
                    <p>Carregando dados do usuário...</p>
                  ) : modal.error ? (
                    <p>{modal.error}</p>
                  ) : (
                    <>
                      <span>Nome</span><strong>{modal.user.name}</strong>
                      <span>E-mail</span><strong>{modal.user.email}</strong>
                      <span>Papel</span><RoleBadge role={modal.user.role} />
                      <span>Status</span><UserStatus isActive={modal.user.isActive} />
                      <span>Criado em</span><strong>{formatDate(modal.user.createdAt)}</strong>
                      <span>Atualizado em</span><strong>{formatDate(modal.user.updatedAt)}</strong>
                      <span>Último acesso</span><strong>{modal.user.lastAccessAt ? formatDate(modal.user.lastAccessAt) : 'Sem registro de acesso'}</strong>
                    </>
                  )}
                </div>
                <div className="users-modal-foot"><button className="btn btn-secondary" type="button" onClick={closeModal}>Fechar</button></div>
              </>
            )}

            {modal.type === 'status' && (
              <>
                <div className="users-confirm">Tem certeza que deseja {modal.user.isActive ? 'desativar' : 'reativar'} este usuário?</div>
                {formError && <div className="users-form-error users-confirm-error">{formError}</div>}
                <div className="users-modal-foot"><button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button><button className="btn btn-primary" type="button" disabled={saving} onClick={() => confirmStatusChange(modal.user)}>{saving ? 'Salvando...' : modal.user.isActive ? 'Desativar' : 'Reativar'}</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
