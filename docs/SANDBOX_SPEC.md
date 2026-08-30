# Especificação do sandbox de demonstração

## Objetivo

Disponibilizar uma demonstração real, preenchida e restaurável do StockRoute. O sandbox deve apresentar o fluxo do ADMIN e do ESTOQUISTA sem mocks, preparação manual do banco ou controles sem efeito.

## Escopo

### Dados de demonstração

- Credenciais fixas para ADMIN e ESTOQUISTA.
- Catálogo com produtos identificáveis e imagens de referência.
- Regras ativas de ocultação.
- Pedidos aguardando revisão, publicados, em picking, concluídos e em observação.
- Itens vinculados, não vinculados, ignorados, coletados e não encontrados.
- Eventos de auditoria coerentes com os pedidos apresentados.
- Um PDF DAV fictício para executar o fluxo de importação.

### Entrada na demonstração

- A tela de login identifica o ambiente como demonstração.
- Cada perfil possui uma ação de entrada rápida.
- As credenciais continuam utilizáveis no formulário normal.
- A interface explica resumidamente o que cada perfil demonstra.

### Fluxo ADMIN

O apresentador deve conseguir demonstrar dashboard, upload, revisão, resolução de itens não vinculados, publicação, acompanhamento de pedidos, produtos, regras, usuários e histórico.

### Fluxo ESTOQUISTA

O apresentador deve conseguir iniciar um pedido, coletar um item com foto, informar um item não encontrado, finalizar o picking e consultar o resumo.

### Restauração

- `npm run demo:reset` recria o estado conhecido do sandbox.
- O reset é idempotente.
- O comando não é exposto como endpoint público.

## Regras de produto

- O sandbox usa as mesmas APIs e tabelas da aplicação real.
- Nenhum dado fictício é embutido em componentes React.
- Contadores devem refletir todos os estados equivalentes exibidos na interface.
- Controles locais que simulam configurações persistentes devem ser removidos ou apresentados como informação.
- Busca ou recuperação de senha não implementadas não devem parecer disponíveis.
- Arquivos e identidades do sandbox não devem mencionar empresas reais.

## Experiência visual

- Preservar a identidade existente: superfícies claras, azul `#2a4dd7`, Inter/Manrope e componentes atuais.
- Usar cor primária para ações e estado ativo, não como decoração.
- Manter ADMIN denso e orientado a desktop; manter ESTOQUISTA mobile-first.
- Loading, erro, vazio, sucesso, foco e estado desabilitado devem ser distinguíveis.
- Não adicionar biblioteca de tour, framework visual ou modo mock.

## Critérios de aceite

1. Um banco vazio recebe migrations e o estado de demonstração com um comando.
2. Executar o reset duas vezes produz o mesmo estado sem conflito.
3. ADMIN e ESTOQUISTA entram pela tela de demonstração.
4. Dashboard, pedidos, histórico e regras abrem com dados significativos.
5. O PDF de exemplo pode ser baixado e importado.
6. O fluxo importado produz itens vinculados, não vinculados e ignorados.
7. Um pedido publicado pode ser processado pelo ESTOQUISTA.
8. Dashboard e histórico refletem as ações realizadas.
9. Nenhum controle visível promete uma função inexistente.
10. Build do frontend, testes do backend e verificação do fluxo passam sem erros.

## Limite inicial

O sandbox usa um banco compartilhado. Isolamento por visitante será adicionado somente se demonstrações simultâneas passarem a causar conflito; até lá, o reset determinístico cobre a necessidade com menos infraestrutura.
