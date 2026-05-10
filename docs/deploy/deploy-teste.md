# Deploy de teste do StockRoute

## 1. Arquitetura

Deploy recomendado para teste:

- Frontend React/Vite em Vercel.
- Backend Node.js/Express em Railway ou Render.
- PostgreSQL online gerenciado pela Railway, Render ou outro provedor compatível.

O frontend chama a API usando `VITE_API_URL`. O backend libera CORS apenas para a origem definida em `FRONTEND_URL`.

## 2. Frontend na Vercel

Configuração sugerida:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Variável de ambiente:

```env
VITE_API_URL=https://url-do-backend.example.com
```

Após alterar `VITE_API_URL`, faça novo deploy do frontend, porque variáveis `VITE_*` são embutidas no build.

## 3. Backend na Railway ou Render

Configuração sugerida:

- Root Directory: `backend`
- Install Command: `npm install`
- Start Command: `npm start`

O backend já usa:

```js
const PORT = process.env.PORT || 3000
```

Railway e Render definem `PORT` automaticamente. Não fixe a porta em produção.

## 4. PostgreSQL online

O backend suporta duas formas de conexão:

### Opção A: `DATABASE_URL`

Mais comum em Railway/Render:

```env
DATABASE_URL=postgresql://usuario:senha@host:porta/banco
```

### Opção B: variáveis separadas

Útil para desenvolvimento local:

```env
DB_HOST=host
DB_PORT=5432
DB_USER=usuario
DB_PASSWORD=senha
DB_NAME=banco
```

Se o provedor exigir SSL:

```env
DB_SSL=true
```

Se o provedor exigir conexão sem validação de certificado local:

```env
DB_SSL_REJECT_UNAUTHORIZED=false
```

Use essa opção apenas quando o provedor recomendar.

## 5. Variáveis do backend

Exemplo seguro para Railway/Render:

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://sua-url-da-vercel.vercel.app
DATABASE_URL=postgresql://usuario:senha@host:porta/banco
DB_SSL=true
JWT_SECRET=gere_uma_chave_segura_com_pelo_menos_32_caracteres
JWT_EXPIRES_IN=1d
JWT_ISSUER=stockroute-api
JWT_AUDIENCE=stockroute-client
```

Não use o `JWT_SECRET` local em produção. Gere uma chave nova e mantenha apenas no painel do provedor.

## 6. Variáveis do frontend

Exemplo para Vercel:

```env
VITE_API_URL=https://sua-api.railway.app
```

Não use `http://localhost:3000` em produção.

## 7. Migrations e seed

Antes de rodar a aplicação em produção, crie as tabelas no PostgreSQL online.

Exemplo local apontando para o banco remoto:

```bash
cd backend/db
psql "$DATABASE_URL" -f migrations/001_create_users.sql
psql "$DATABASE_URL" -f migrations/002_create_products.sql
psql "$DATABASE_URL" -f migrations/003_create_orders.sql
psql "$DATABASE_URL" -f migrations/004_create_order_items.sql
psql "$DATABASE_URL" -f migrations/005_create_picking_evidences.sql
psql "$DATABASE_URL" -f migrations/006_create_missing_items.sql
psql "$DATABASE_URL" -f migrations/007_create_ignored_dav_items.sql
psql "$DATABASE_URL" -f seeds/seed_001_initial.sql
```

Não rode migrations ou seed em produção sem confirmar o banco alvo.

## 8. Testar o backend

Health check:

```bash
curl https://sua-api.railway.app/health
```

Resultado esperado:

```json
{"status":"ok","message":"API StockRoute funcionando"}
```

Login:

```bash
curl -X POST https://sua-api.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@stockroute.com","password":"admin123"}'
```

Resultado esperado: status `200`, `token` JWT e dados públicos do usuário.

## 9. Erros comuns

### CORS

Sintoma: navegador bloqueia a chamada do frontend.

Verifique no backend:

```env
FRONTEND_URL=https://sua-url-da-vercel.vercel.app
```

Não use `*` sem necessidade.

### `VITE_API_URL`

Sintoma: frontend tenta chamar `localhost` em produção.

Verifique na Vercel:

```env
VITE_API_URL=https://url-real-do-backend
```

Depois faça redeploy.

### `DATABASE_URL`

Sintoma: backend sobe, mas falha ao conectar no banco.

Verifique se `DATABASE_URL` está completa e se o provedor exige `DB_SSL=true`.

### `JWT_SECRET`

Sintoma: backend encerra na inicialização ou token não valida.

Use uma chave com pelo menos 32 caracteres e mantenha `JWT_ISSUER`/`JWT_AUDIENCE` iguais entre geração e validação.

## 10. Uploads locais

O projeto possui pasta `uploads/` para desenvolvimento. Armazenamento local não é ideal em produção porque containers podem ser reiniciados e perder arquivos.

Para produção real, planeje S3, Cloudflare R2, Supabase Storage ou outro storage externo.

## 11. Checklist rápido

- Backend com `npm start`.
- Frontend com `npm run build`.
- `FRONTEND_URL` aponta para Vercel.
- `VITE_API_URL` aponta para Railway/Render.
- Banco online recebeu migrations.
- Seed rodou apenas no banco correto.
- `/health` retorna `200`.
- `/auth/login` retorna token.
