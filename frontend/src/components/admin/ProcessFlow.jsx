// Seção visual do fluxo de etapas do pedido (pipeline).
// O passo 4 (Revisão ADMIN) é destacado automaticamente.
import './ProcessFlow.css';

const STEPS = [
  { num: 1, title: 'Upload DAV',      desc: 'PDF enviado pelo ADMIN' },
  { num: 2, title: 'Extração',        desc: 'Itens lidos do PDF' },
  { num: 3, title: 'Comparação',      desc: 'Com catálogo de produtos' },
  { num: 4, title: 'Revisão ADMIN',   desc: 'Vínculo, fábrica, ignorar', highlight: true },
  { num: 5, title: 'Publicação',      desc: 'Pedido liberado' },
  { num: 6, title: 'Picking',         desc: 'Estoquista separa' },
];

export default function ProcessFlow() {
  return (
    <section className="card pipeline">
      <div className="pipeline-head">
        <div>
          <h2>Fluxo do pedido</h2>
          <p>Etapas que cada DAV percorre — destaque para onde o ADMIN atua</p>
        </div>
        <button className="btn btn-ghost btn-sm" type="button">Como funciona?</button>
      </div>
      <div className="pipeline-steps">
        {STEPS.map((step) => (
          <div key={step.num} className={`pipe-step${step.highlight ? ' highlight' : ''}`}>
            <span className="pipe-num">{step.num}</span>
            <div className="pipe-title">{step.title}</div>
            <div className="pipe-desc">{step.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
