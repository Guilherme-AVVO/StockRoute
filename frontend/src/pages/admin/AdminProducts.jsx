// Página de CRUD de produtos para o ADMIN.
// Permite listar, buscar, criar, editar e excluir produtos do catálogo.
import { useState, useEffect, useCallback } from 'react';
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../services/productService.js';
import './AdminProducts.css';

// Unidades disponíveis conforme constraint do banco.
const UNITS = [
  { value: 'UN', label: 'UN — Unidade'  },
  { value: 'CX', label: 'CX — Caixa'   },
  { value: 'SC', label: 'SC — Saco'     },
  { value: 'PC', label: 'PC — Peça'     },
  { value: 'CT', label: 'CT — Cartela'  },
  { value: 'PR', label: 'PR — Par'      },
  { value: 'M',  label: 'M  — Metro'    },
];

const EMPTY_FORM = { sku: '', name: '', unit: 'UN', imageUrl: '' };

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function AdminProducts() {
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState(null);
  const [search,      setSearch]      = useState('');

  // Modal criar/editar
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null); // null = novo, objeto = editar
  const [formData,    setFormData]    = useState(EMPTY_FORM);
  const [formError,   setFormError]   = useState(null);
  const [saving,      setSaving]      = useState(false);

  // Confirmação de exclusão
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  // Toast de feedback
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  const fetchProducts = useCallback(async (q = '') => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await listProducts(q);
      setProducts(data);
    } catch (err) {
      setFetchError(err.message || 'Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function handleSearch(e) {
    e.preventDefault();
    fetchProducts(search.trim());
  }

  function openCreate() {
    setEditTarget(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditTarget(product);
    setFormData({
      sku:      product.sku,
      name:     product.name,
      unit:     product.unit,
      imageUrl: product.imageUrl || '',
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
    setFormError(null);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editTarget) {
        await updateProduct(editTarget.id, formData);
        showToast('success', 'Produto atualizado com sucesso.');
      } else {
        await createProduct(formData);
        showToast('success', 'Produto criado com sucesso.');
      }
      closeModal();
      fetchProducts(search.trim());
    } catch (err) {
      setFormError(err.message || 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      showToast('success', 'Produto excluído com sucesso.');
      setDeleteTarget(null);
      fetchProducts(search.trim());
    } catch (err) {
      showToast('error', err.message || 'Erro ao excluir produto.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="products-page">

      {/* Toast de feedback */}
      {toast && (
        <div className={`products-toast products-toast--${toast.type}`} role="status">
          {toast.type === 'success' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          {toast.message}
        </div>
      )}

      {/* Hero da seção */}
      <section className="hero products-hero">
        <div>
          <h1>Produtos</h1>
          <p>
            Cadastre e gerencie os produtos usados na comparação dos itens extraídos do DAV.
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" type="button" onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Novo produto
          </button>
        </div>
      </section>

      {/* Barra de busca */}
      <div className="products-toolbar card">
        <form className="products-search" onSubmit={handleSearch}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por SKU ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar produto"
          />
          <button className="btn btn-secondary btn-sm" type="submit">Buscar</button>
        </form>
      </div>

      {/* Conteúdo principal */}
      {loading && (
        <div className="products-loading">Carregando produtos...</div>
      )}

      {!loading && fetchError && (
        <div className="products-error card">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {fetchError}
        </div>
      )}

      {!loading && !fetchError && products.length === 0 && (
        <div className="products-empty card">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M3 7h18M3 12h18M3 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p>Nenhum produto encontrado.</p>
          <button className="btn btn-primary btn-sm" type="button" onClick={openCreate}>
            Cadastrar primeiro produto
          </button>
        </div>
      )}

      {!loading && !fetchError && products.length > 0 && (
        <div className="products-table-wrap card">
          <table className="products-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nome</th>
                <th>Unidade</th>
                <th className="col-img">Imagem</th>
                <th className="col-date">Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <span className="products-sku">{product.sku}</span>
                  </td>
                  <td className="products-name">{product.name}</td>
                  <td>
                    <span className="products-unit">{product.unit}</span>
                  </td>
                  <td className="col-img">
                    {product.imageUrl ? (
                      <img
                        className="products-img"
                        src={product.imageUrl}
                        alt={product.name}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="products-no-img">—</span>
                    )}
                  </td>
                  <td className="col-date products-date">{formatDate(product.createdAt)}</td>
                  <td>
                    <div className="products-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        title="Editar produto"
                        onClick={() => openEdit(product)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                            stroke="currentColor" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                            stroke="currentColor" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Editar
                      </button>
                      <button
                        className="btn btn-ghost btn-sm products-btn-delete"
                        type="button"
                        title="Excluir produto"
                        onClick={() => setDeleteTarget(product)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <polyline points="3 6 5 6 21 6" stroke="currentColor"
                            strokeWidth="1.8" strokeLinecap="round" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
                            stroke="currentColor" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="products-count">
            {products.length} produto{products.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* ======================================================
          Modal — criar ou editar produto
      ====================================================== */}
      {modalOpen && (
        <div
          className="modal-overlay open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="modal product-modal">
            <div className="modal-head">
              <div>
                <h2 id="product-modal-title">
                  {editTarget ? 'Editar produto' : 'Novo produto'}
                </h2>
                <div className="sub">
                  {editTarget
                    ? 'Atualize os dados do produto cadastrado.'
                    : 'Preencha os dados para cadastrar um novo produto.'}
                </div>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={closeModal}
                aria-label="Fechar modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body product-form">

                <div className="form-group">
                  <label htmlFor="prod-sku">
                    SKU <span className="required">*</span>
                  </label>
                  <input
                    id="prod-sku"
                    name="sku"
                    type="text"
                    className="form-input"
                    placeholder="Ex.: PARF001"
                    value={formData.sku}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prod-name">
                    Nome <span className="required">*</span>
                  </label>
                  <input
                    id="prod-name"
                    name="name"
                    type="text"
                    className="form-input"
                    placeholder="Ex.: Parafuso 6mm"
                    maxLength={150}
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prod-unit">
                    Unidade <span className="required">*</span>
                  </label>
                  <select
                    id="prod-unit"
                    name="unit"
                    className="form-input form-select"
                    value={formData.unit}
                    onChange={handleFormChange}
                    required
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="prod-image">URL da imagem</label>
                  <input
                    id="prod-image"
                    name="imageUrl"
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={formData.imageUrl}
                    onChange={handleFormChange}
                  />
                  <span className="form-hint">
                    Opcional. Upload de arquivo não disponível nesta versão.
                  </span>
                </div>

                {formError && (
                  <div className="modal-error">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path d="M12 8v4M12 16h.01" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    {formError}
                  </div>
                )}
              </div>

              <div className="modal-foot">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving
                    ? 'Salvando...'
                    : editTarget
                      ? 'Salvar alterações'
                      : 'Cadastrar produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          Modal — confirmação de exclusão
      ====================================================== */}
      {deleteTarget && (
        <div
          className="modal-overlay open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="modal product-modal product-modal--sm">
            <div className="modal-head">
              <div>
                <h2 id="delete-modal-title">Excluir produto?</h2>
                <div className="sub">
                  <strong>{deleteTarget.name}</strong> ({deleteTarget.sku}) será removido
                  permanentemente. Esta ação não pode ser desfeita.
                </div>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setDeleteTarget(null)}
                aria-label="Fechar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="modal-foot">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Excluindo...' : 'Excluir produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
