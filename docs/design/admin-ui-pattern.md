# Padrão visual da área ADMIN

## Base visual

A área ADMIN segue o design aprovado da Dashboard ADMIN e da tela Upload DAV. As próximas telas devem reutilizar a mesma estrutura, tokens visuais, componentes e espaçamentos para parecerem parte do mesmo painel operacional.

## Cores principais

- Fundo geral: `#fbf8ff`
- Azul principal: `#2a4dd7`
- Cards brancos: `#ffffff`
- Bordas suaves: `#e2e1ed`
- Blocos internos suaves: `#f4f2fe`
- Detalhes azul/lilás: `#b9c3ff` e `#dde1ff`

## Estrutura

- Sidebar lateral no desktop
- Header/topbar no topo
- Conteúdo principal em cards
- Títulos claros
- Subtítulos explicativos
- Cards com bordas arredondadas
- Tabelas no desktop
- Cards empilhados no mobile

## Responsividade

- A área ADMIN é pensada primeiro para PC
- Depois adaptada para celular
- No PC, priorizar tabelas, grids e visão geral
- No celular, empilhar cards e evitar rolagem horizontal

## Componentes reutilizáveis

- `AdminLayout`
- Sidebar
- Header
- Cards
- Badges de status
- Tabelas responsivas
- Modais
- Botões principais/secundários
- Estados de erro/sucesso/loading

## Regra importante

As próximas telas ADMIN devem parecer continuação natural da Dashboard ADMIN e da tela Upload DAV. Não criar visual novo para cada página.
