# Usuários ADMIN com dados reais

A aba **Usuários** consome o CRUD real de `/users`. Não há usuários mockados, contadores fixos, pedidos falsos ou atividade recente inventada.

## Tabela usada

Tabela: `users`

Campos usados pela funcionalidade:

| Campo | Uso |
|---|---|
| `id` | Identificador UUID |
| `name` | Nome do usuário |
| `email` | Login e contato, único |
| `password_hash` | Hash bcrypt salvo no banco; nunca retorna na API |
| `role` | `ADMIN` ou `ESTOQUISTA` |
| `is_active` | Status de acesso |
| `created_at` | Data de criação |
| `updated_at` | Data de atualização |

Migration criada: `backend/db/migrations/015_add_user_status.sql`, adicionando `is_active BOOLEAN NOT NULL DEFAULT true`.

## Endpoints

Todos os endpoints são protegidos por `authMiddleware` e `requireRole('ADMIN')`.

| Método | Rota | Função |
|---|---|---|
| `GET` | `/users` | Lista usuários reais, com filtros opcionais `search`, `role`, `status` |
| `GET` | `/users/:id` | Consulta um usuário real |
| `POST` | `/users` | Cria usuário |
| `PUT` | `/users/:id` | Edita nome, e-mail, papel e status |
| `PATCH` | `/users/:id/status` | Ativa ou desativa usuário |

Campos retornados em camelCase: `id`, `name`, `email`, `role`, `isActive`, `lastAccessAt`, `createdAt`, `updatedAt`.

`lastAccessAt` retorna `null`, porque ainda não existe coluna real de último acesso.

## Segurança

- Sem token: `401`.
- Usuário sem papel `ADMIN`: `403`.
- Usuário inexistente: `404`.
- E-mail duplicado: `409`.
- Validação inválida: `400`.
- `password_hash` nunca é retornado.
- Senha é hasheada com `bcrypt` antes de salvar.
- O backend não loga senha nem token completo.
- Usuários inativos não conseguem fazer login e tokens de usuários inativos são rejeitados nas rotas protegidas.
- O ADMIN não pode desativar o próprio usuário via `/users/:id/status`.

## Como criar usuário

`POST /users`

```json
{
  "name": "João Estoquista",
  "email": "joao@motomadeiras.com",
  "password": "senhaInicial123",
  "role": "ESTOQUISTA",
  "isActive": true
}
```

## Como editar usuário

`PUT /users/:id`

```json
{
  "name": "João Estoquista",
  "email": "joao@motomadeiras.com",
  "role": "ADMIN",
  "isActive": true
}
```

Senha não é editada por esta rota.

## Como ativar/desativar

`PATCH /users/:id/status`

```json
{
  "isActive": false
}
```

Resposta:

```json
{
  "message": "Usuário desativado com sucesso.",
  "user": {
    "id": "...",
    "name": "João Estoquista",
    "email": "joao@motomadeiras.com",
    "role": "ESTOQUISTA",
    "isActive": false,
    "lastAccessAt": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## Frontend

Arquivo principal: `frontend/src/pages/admin/AdminUsers.jsx`.

Service: `frontend/src/services/userService.js`.

A tela:

- carrega `GET /users` ao abrir;
- mostra loading, erro amigável e estado vazio real;
- filtra localmente por nome/e-mail, papel e status sobre dados reais;
- cria usuário com `POST /users`;
- edita usuário com `PUT /users/:id`;
- ativa/desativa com `PATCH /users/:id/status`;
- consulta detalhes com `GET /users/:id`;
- calcula cards de resumo a partir da lista real carregada.

## Auditoria

Se `audit_events` existir, os eventos são registrados:

- `USER_CREATED`
- `USER_UPDATED`
- `USER_STATUS_CHANGED`

## Como testar

1. Rodar `cd backend && npm run migrate`.
2. Rodar `cd backend && npm run dev`.
3. Rodar `cd frontend && npm run dev`.
4. Login como `admin@stockroute.com`.
5. Abrir a aba **Usuários**.
6. Criar, editar, desativar e reativar um usuário.
7. Recarregar a página e conferir que os dados persistem.
8. Testar e-mail duplicado e confirmar resposta `409`.
9. Testar acesso sem token (`401`) e como `ESTOQUISTA` (`403`).

## Limitações atuais

- Não há coluna real de último acesso; a API retorna `lastAccessAt: null` e a tela mostra "Sem registro de acesso".
- Reset de senha administrativo não foi implementado neste ciclo.
- `must_change_password` ainda não existe; a troca obrigatória no primeiro acesso continua como pendência.
