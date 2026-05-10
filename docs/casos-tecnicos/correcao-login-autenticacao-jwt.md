# Correção de erro no login com autenticação JWT

## 1. Contexto do projeto

O StockRoute é um sistema para gerenciamento de pedidos e separação de itens em processo de picking. O backend usa Node.js, Express, PostgreSQL, SQL puro, bcrypt para hash de senha e JWT para autenticação stateless. O frontend usa React com Vite, CSS separado e `fetch` nativo para chamar a API.

## 2. Problema encontrado

O sistema subia em localhost e as rotas principais respondiam, mas o login sempre falhava. Mesmo com frontend, backend e banco aparentemente funcionando, as credenciais informadas eram recusadas e o usuário não conseguia avançar para a área autenticada.

## 3. Sintomas observados

- As credenciais eram recusadas com erro de autenticação.
- A chamada para `/auth/login` retornava `401 Unauthorized`.
- O token JWT não era gerado durante o login real.
- O frontend exibia erro de credenciais inválidas e não liberava o dashboard.
- O endpoint `/health` respondia normalmente, indicando que a API estava online.

## 4. Hipóteses investigadas

Durante a investigação, foram verificados os seguintes pontos:

- Se o frontend enviava exatamente `{ email, password }`.
- Se o formulário usava `preventDefault` e atualizava corretamente os estados de e-mail e senha.
- Se a variável `VITE_API_URL` apontava para `http://localhost:3000`.
- Se o frontend chamava `POST /auth/login`.
- Se a rota `/auth/login` estava registrada no backend.
- Se `express.json()` estava configurado antes das rotas.
- Se o controller lia `email` e `password` do `req.body`.
- Se o banco usado pelo backend era o mesmo banco consultado manualmente.
- Se a tabela `users` existia e tinha a coluna `password_hash`.
- Se o usuário ADMIN realmente existia no banco.
- Se o hash salvo tinha formato bcrypt válido.
- Se `bcrypt.compare` estava usando a coluna correta.
- Se havia divergência entre as credenciais da especificação, do `AGENTS.md`, do seed e do banco real.
- Se `JWT_SECRET`, expiração, issuer e audience estavam configurados.
- Se o erro acontecia antes ou depois da geração do JWT.
- Se o rate limit estava bloqueando o login.
- Se CORS impedia a chamada a partir do frontend.

## 5. Causa raiz

A causa raiz foi um hash bcrypt incompatível com a senha documentada para o usuário ADMIN.

O banco real tinha o usuário `admin@stockroute.com`, mas o hash salvo para esse usuário não correspondia à senha `admin123`. O hash tinha formato bcrypt válido, porém `bcrypt.compare('admin123', hash)` retornava `false`.

Também havia divergência documental: a especificação original mencionava `admin@motomadeiras.com.br` / `admin@123`, enquanto o projeto atual e o banco usavam `admin@stockroute.com` / `admin123`.

## 6. Correção aplicada

Arquivos alterados:

- `backend/db/seeds/seed_001_initial.sql`: o seed foi substituído por uma versão limpa, com hashes bcrypt válidos para os usuários de desenvolvimento.
- `backend/src/services/authService.js`: recebeu comentários explicando a comparação com bcrypt e a geração do JWT, sem mudança de lógica.
- `backend/src/controllers/authController.js`: recebeu comentário sobre a validação básica do login.
- `backend/src/routes/authRoutes.js`: recebeu comentários sobre rota pública de login, rate limit e rotas protegidas.
- `backend/src/middlewares/authMiddleware.js`: recebeu comentários sobre validação do token JWT.
- `backend/src/middlewares/requireRole.js`: recebeu comentário sobre uso após `authMiddleware`.
- `backend/src/middlewares/loginRateLimiter.js`: recebeu comentário sobre proteção contra tentativas repetidas.
- `backend/src/middlewares/errorHandler.js`: recebeu comentário sobre não expor detalhes sensíveis ao cliente.
- `frontend/src/services/api.js`: recebeu comentários sobre `fetch`, JSON e envio do Bearer token.
- `frontend/src/services/authService.js`: recebeu comentários sobre login, salvamento de sessão e logout.
- `frontend/src/context/AuthContext.jsx`: recebeu comentários sobre validação de sessão, login e logout.
- `frontend/src/App.jsx`: recebeu comentários sobre proteção da tela autenticada.
- `frontend/src/pages/Login.css`: recebeu comentários de organização das principais áreas visuais.

Além do seed, o banco local de desenvolvimento foi atualizado para que o usuário existente `admin@stockroute.com` passasse a usar um hash bcrypt compatível com `admin123`.

## 7. Como testar a correção

Subir o backend:

```bash
cd backend
npm run dev
```

Subir o frontend:

```bash
cd frontend
npm run dev
```

Testar a API:

```bash
curl http://localhost:3000/health
```

Testar o login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@stockroute.com","password":"admin123"}'
```

Também é possível acessar `http://localhost:5173/` no navegador e fazer login com o mesmo usuário de desenvolvimento.

## 8. Resultado esperado

O endpoint `/auth/login` deve retornar status `200`, um token JWT e os dados públicos do usuário. No frontend, o token é salvo em `sessionStorage`, a sessão é reconhecida pelo `AuthContext` e o usuário consegue acessar a área autenticada.

## 9. O que aprendi com esse erro

- Testar o backend separado do frontend ajuda a localizar se o problema está na interface ou na API.
- Conferir o banco real usado pela aplicação evita diagnóstico baseado em arquivos antigos ou exemplos desatualizados.
- Seeds precisam ser validados, principalmente quando incluem hashes de senha.
- Não se deve assumir nomes de tabelas e colunas; eles precisam bater com o schema real.
- Mensagens genéricas para credenciais inválidas ajudam a não revelar se o e-mail existe.
- Tokens, hashes completos e segredos não devem ser expostos em logs, tela ou documentação.
- Testes isolados com bcrypt ajudam a confirmar se a senha esperada bate com o hash salvo.

## 10. Como eu explicaria em uma entrevista

Durante o desenvolvimento do StockRoute, encontrei um problema em que o login falhava mesmo com frontend, backend e banco rodando corretamente. Em vez de assumir que era um erro visual, testei a API com `curl`, conferi a rota `/auth/login`, validei o body enviado pelo frontend, consultei o banco real usado pela aplicação e testei o hash salvo com `bcrypt.compare`. Descobri que o usuário existia, mas o hash bcrypt salvo não correspondia à senha documentada. Corrigi o seed com hashes válidos, atualizei o banco local de desenvolvimento e validei o fluxo completo: login retornando JWT e `/auth/me` aceitando o token. Esse processo reforçou a importância de investigar cada camada separadamente e de não expor dados sensíveis durante o diagnóstico.
