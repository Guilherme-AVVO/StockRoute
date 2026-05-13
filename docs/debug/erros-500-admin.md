# Erros 500 nas telas ADMIN — diagnóstico e correção

## Resumo

A mensagem genérica **"Erro interno do servidor"** estava aparecendo em várias
telas do ADMIN (Produtos, Itens ignorados, Upload DAV). Causa raiz: o
`errorHandler` central só convertia em HTTP status erros lançados com
`{ status, message }`. Tudo o que vinha do PostgreSQL, do multer ou do
pdf-parse caía no fallback 500 com mensagem genérica.

## Endpoints que retornavam 500 indevidamente

Validado por reprodução local (curl). Antes da correção:

| Cenário | Endpoint | Comportamento | Causa real |
|---|---|---|---|
| Editar/deletar com ID corrompido | `GET/PUT/DELETE /products/:id` | 500 | PostgresError `22P02 invalid input syntax for type uuid` |
| Listar/abrir pedido inválido | `GET /orders/:id`, `PUT /orders/:id/publish` | 500 | Idem |
| Desocultar regra | `DELETE /ignored-dav-items/:id` | 500 | Idem |
| Vincular/cadastrar a partir de item | `PATCH /unlinked-dav-items/:id/link-product`, `POST /unlinked-dav-items/:id/create-product`, `POST /unlinked-dav-items/:id/hide` | 500 | Idem |
| Upload de arquivo não-PDF | `POST /orders/import` | 500 | Multer fileFilter lança `new Error('Apenas arquivos PDF são aceitos')` sem `.status` |
| Upload de PDF corrompido | `POST /orders/import` | 500 | `pdf-parse` lança `InvalidPDFException: Invalid PDF structure` sem `.status` |

Em todos os casos, o cliente recebia `{"message":"Erro interno do servidor"}`
com HTTP 500 — sem informação útil para o ADMIN.

## Causa real

`backend/src/middlewares/errorHandler.js` original:

```js
export function errorHandler(err, _req, res, _next) {
  if (err.status && err.message) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error('[Server Error]', err.message ?? err);
  return res.status(500).json({ message: 'Erro interno do servidor' });
}
```

Erros que **não tinham `.status`** caíam direto no 500:
- Erros do postgres.js (`PostgresError` com `.code` SQLSTATE)
- Erros do multer fileFilter (`Error` simples sem status)
- Erros do pdf-parse (`InvalidPDFException` sem status)

## Correção aplicada

[backend/src/middlewares/errorHandler.js](../../backend/src/middlewares/errorHandler.js):

1. **Mapa de SQLSTATE → HTTP** cobre os erros estruturais do banco:
   - `22P02` (UUID/valor inválido) → **400 "Identificador ou valor com formato inválido"**
   - `23502` (NOT NULL violation) → **400 "Campo obrigatório ausente"**
   - `23505` (UNIQUE violation) → **409 "Já existe um registro com esses dados"**
   - `23503` (FK violation) → **409 "Recurso vinculado a outros registros..."**
   - `23514` (CHECK violation) → **400 "Valor não atende às regras..."**
   - `22001` (string truncation) → **400 "Valor maior que o tamanho permitido"**

2. **Erros do multer** (incluindo a mensagem do nosso fileFilter) viram **400**, com mensagem específica
   para `LIMIT_FILE_SIZE`.

3. **Erros do pdf-parse** (regex em `invalid pdf structure|password|encrypted`) viram
   **422 "PDF inválido ou ilegível. Verifique se o arquivo é um DAV válido."**

4. **Log estruturado** em todos os caminhos: `method`, `path`, `name`, `code`, `message`.
   Em `NODE_ENV !== 'production'`, também loga o **stack completo** — sem expor token,
   senha, body completo ou variáveis de ambiente sensíveis.

5. **500 genérico** continua existindo para erros realmente desconhecidos, mas agora
   é a exceção, não a regra.

## Arquivos corrigidos

| Arquivo | Mudança |
|---|---|
| [backend/src/middlewares/errorHandler.js](../../backend/src/middlewares/errorHandler.js) | Mapeamento PG + multer + pdf-parse; logs estruturados com stack em dev |

## Migrations criadas/ajustadas

Nenhuma. O banco já tinha todas as colunas que o código espera (validado por GETs
funcionando: `/products`, `/ignored-dav-items`, `/unlinked-dav-items`, `/orders`,
`/dashboard/stats` retornam 200 com dados).

## Testes executados (curl, banco local)

### Antes da correção
Todos os cenários da tabela retornavam **500 "Erro interno do servidor"**.

### Depois da correção

```
[1] DELETE /ignored-dav-items/abc-invalid   → HTTP 400  "Identificador ou valor com formato inválido"
[2] GET    /products/abc                    → HTTP 400  "Identificador ou valor com formato inválido"
[3] PUT    /products/abc                    → HTTP 400  "Identificador ou valor com formato inválido"
[4] GET    /orders/abc                      → HTTP 400  "Identificador ou valor com formato inválido"
[5] POST   /orders/import (arquivo .txt)    → HTTP 400  "Apenas arquivos PDF são aceitos"
[6] POST   /orders/import (PDF corrompido)  → HTTP 422  "PDF inválido ou ilegível..."
[7] PATCH  /unlinked-dav-items/abc/link…    → HTTP 400  "Identificador ou valor com formato inválido"

GET /products              → HTTP 200 ✓
GET /ignored-dav-items     → HTTP 200 ✓
GET /unlinked-dav-items    → HTTP 200 ✓
GET /orders                → HTTP 200 ✓
GET /dashboard/stats       → HTTP 200 ✓
```

### Reproduzindo localmente

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@stockroute.com","password":"admin123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Era 500, agora é 400
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/products/uuid-invalido

# Era 500, agora é 400 com mensagem específica
echo lixo > /tmp/fake.txt
curl -i -X POST http://localhost:3000/orders/import \
  -H "Authorization: Bearer $TOKEN" -F "pdf=@/tmp/fake.txt"
```

## Pendências

- **Erros realmente inesperados** (ex: falha de conexão com banco) ainda viram 500 genérico.
  Isso é intencional para não vazar internals do sistema.
- **Logs em produção**: hoje vão para `console.error`. Se for necessário centralizar em
  Render/Datadog/Logtail, basta wrapping em `logServerError`.
- **Erros do pdf-parse específicos** (PDF protegido por senha, criptografado) caem na regex
  geral; podem ganhar mensagens mais específicas se virar caso recorrente.

## O que não foi alterado

- Login / autenticação (`authMiddleware`, JWT, bcrypt) — intactos.
- Frontend services — não alterados. Eles já lidavam bem com 400/409/404, só viam 500 demais
  do backend antes.
- Banco — sem migrations, sem ALTERs.
