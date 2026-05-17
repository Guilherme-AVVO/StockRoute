# Frontend do picking — design mobile-first

Implementação do design do ESTOQUISTA gerado no Claude Design e exportado para o React do StockRoute.

## Arquivo de design usado

`picking-preview.html` do bundle Claude Design (vault `stockrouter`). O HTML é apenas a stage de preview — os arquivos `.jsx`/`.css` em `frontend/src/pages/stockist/` e `frontend/src/components/stockist/` são a fonte real, e foram convertidos para o projeto sem dependências do preview.

## Telas e componentes implementados

| Arquivo | Função |
|--------|--------|
| [pages/stockist/StockistApp.jsx](../../frontend/src/pages/stockist/StockistApp.jsx) | Container do fluxo (Pedidos → Picking → Resumo). Mantém o estado de picking por pedido em memória. |
| [pages/stockist/StockistOrders.jsx](../../frontend/src/pages/stockist/StockistOrders.jsx) + [.css](../../frontend/src/pages/stockist/StockistOrders.css) | Tela 1 — pedidos aguardando, com pill de entrega (hoje/próxima/atrasado), busca e estados (loading/empty/error). |
| [pages/stockist/StockistPicking.jsx](../../frontend/src/pages/stockist/StockistPicking.jsx) + [.css](../../frontend/src/pages/stockist/StockistPicking.css) | Tela 2 — separação: header com progresso, filtros segmentados, lista de itens, ações Referência/Coletar/Não encontrado, barra fixa "Finalizar pedido". |
| [pages/stockist/StockistOrderSummary.jsx](../../frontend/src/pages/stockist/StockistOrderSummary.jsx) + [.css](../../frontend/src/pages/stockist/StockistOrderSummary.css) | Tela 3 — resumo final: KPIs, identificação, tempos, fotos anexadas, itens não encontrados. |
| [pages/stockist/stockist.css](../../frontend/src/pages/stockist/stockist.css) | Tokens visuais da área ESTOQUISTA (mesma identidade do ADMIN) + botões/badges/pills/shell mobile (`.stockist-shell` com `max-width: 480px`). |
| [components/stockist/StockistModal.jsx](../../frontend/src/components/stockist/StockistModal.jsx) + [.css](../../frontend/src/components/stockist/StockistModal.css) | Bottom-sheet reutilizado por todos os modais; ESC fecha; trava scroll do body. |
| [components/stockist/ProductReferenceModal.jsx](../../frontend/src/components/stockist/ProductReferenceModal.jsx) | Modal "Referência" — foto cadastrada do produto + ficha técnica + banner explicando que ela NÃO é a foto de coleta. |
| [components/stockist/CollectItemModal.jsx](../../frontend/src/components/stockist/CollectItemModal.jsx) | Modal "Coletar" — `<input type="file" accept="image/*" capture="environment">` abre a câmera traseira no celular; preview da foto; confirmar desabilitado até existir foto. |
| [components/stockist/NotFoundModal.jsx](../../frontend/src/components/stockist/NotFoundModal.jsx) | Modal "Não encontrado" — motivos em rádios; observação obrigatória se motivo for `OUTRO`. |
| [pages/stockist/stockistFormat.js](../../frontend/src/pages/stockist/stockistFormat.js) | Helpers de formatação e lista `NOT_FOUND_REASONS`, sem dados mockados. |

## Como o HTML foi convertido

O `picking-preview.html` é uma stage para rodar o React via Babel standalone dentro de um phone-frame de preview. A conversão para o projeto real consistiu em:

1. **Descartar** a stage do preview (frame de celular, toolbar de viewport, react via CDN).
2. **Copiar** o módulo `pages/stockist/*` e `components/stockist/*` do bundle como fonte direta — já vinham idiomáticos em React + CSS separado.
3. **Plugar** o `StockistApp` no [App.jsx](../../frontend/src/App.jsx): ADMIN continua indo para `AdminDashboard`; qualquer outro role (ESTOQUISTA / etc.) cai no `StockistApp`.

## CSS separado

Cada componente importa seu próprio `.css` ao lado dele. Não há CSS-in-JS, Tailwind, styled-components nem inline styles além de ajustes mínimos (pesos, posicionamento de badges absoluto, etc.). Comentários em PT-BR descrevem blocos importantes (header, progresso, segmentado, itens, ações, modais, responsividade).

## Proporção mobile

- Container principal `.stockist-shell` com `max-width: 480px`, `margin: 0 auto`, `min-height: 100dvh` e `padding-bottom: 96px` para a barra fixa inferior.
- Padding mobile: 14–16 px nos `.stk-content`; gap entre cards 10–12 px.
- Todos os botões principais e radios têm `min-height: 48px`.
- Barra de progresso integrada ao header azul, sempre visível, com legenda.
- Em 360 px o grid de ações por item vira 2 colunas (Coletar full-width no topo); a partir de 380 px vai para 3 colunas. As metas (Ref/SKU/Fabricante) usam `flex-wrap` e nunca causam rolagem horizontal.
- A barra "Finalizar pedido" é `position: fixed` na largura do shell; em telas ≥ 481 px ela centraliza para acompanhar o shell em vez de ocupar a janela inteira.
- Modais são bottom-sheets em mobile e centralizados em telas largas (`min-height: 720px` + `min-width: 540px`).
- Sem rolagem horizontal em nenhuma das larguras (verificado via build do Vite — 90 módulos transformados sem warnings).

## Comportamento em 360 / 390 / 430 px

- **360 px** — ações por item em 2 colunas (Coletar full em cima); meta do produto quebra em linhas; chips de filtro rolam horizontalmente sem scrollbar visível (`scrollbar-width: none`).
- **390 px** — viewport padrão do design; layout idêntico ao protótipo, com 3 colunas para Referência/Coletar/Não encontrado.
- **430 px** — mais respiro lateral; cards e modais continuam bem proporcionais; pill de entrega + botão de iniciar separação ficam lado a lado nos cards (`@media (min-width: 400px)`).

## Interações visuais funcionando

| Ação | O que faz |
|------|-----------|
| Tocar em um card de pedido (Iniciar separação) | Cria sessão (start = agora) e vai para o Picking |
| **Referência** em um item | Abre `ProductReferenceModal` com foto/ficha + banner explicativo |
| **Coletar** em um item | Abre `CollectItemModal`; ao escolher uma imagem, exibe preview; "Confirmar coleta" habilita; ao confirmar, item vira COLETADO e fica com foto-evidência |
| **Não encontrado** em um item | Abre `NotFoundModal`; motivo obrigatório; nota obrigatória se "Outro"; ao confirmar, item vira NAO_ENCONTRADO |
| Filtros segmentados | Mostram Todos / Pendentes / Coletados / Não encontrados com contagem |
| **Desfazer** em item processado | Volta o item para PENDENTE e libera o objectURL da foto |
| Barra de progresso | Atualiza coletados / não encontrados / pendentes e percentual em tempo real |
| **Finalizar pedido** | Só habilita quando `pendentes === 0`; ao tocar, grava sessionEnd e vai para o Resumo |
| Resumo final | Status CONCLUÍDO (verde) se tudo coletado; OBSERVAÇÃO (laranja) se houver não encontrados; mostra duração da sessão, fotos e itens com observação |

## Integração real

O fluxo do estoquista usa `frontend/src/services/stockistService.js` e rotas reais em `/stockist`.
Pedidos disponíveis, início de separação, coleta com foto, item não encontrado,
finalização e resumo são persistidos pelo backend.

## Como testar manualmente

```bash
cd frontend
npm run dev
# abre http://localhost:5173 — login com um usuário não-ADMIN entra direto no fluxo do estoquista
```

Em DevTools, testar em viewports **360 / 390 / 430 px** e desktop (≥ 481 px deve centralizar com largura confortável). Validar fluxo: Iniciar separação → Referência → Coletar → Não encontrado → Finalizar pedido.
