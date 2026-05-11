# CRUD de Produtos

## Por que produtos são necessários

O fluxo de picking começa no upload de um PDF DAV. Cada item extraído precisa ser comparado com o catálogo de produtos cadastrados:

- **Item com SKU encontrado** → entra na lista de separação do estoquista.
- **Item sem SKU cadastrado** → vai para revisão do ADMIN.
- **Item com regra de ignorar** → não vai para o estoquista (registrado para auditoria).

Sem um catálogo de produtos, não há base de comparação e o fluxo de picking não funciona.

## Tabela usada

```sql
products (
  id         UUID PRIMARY KEY,
  sku        TEXT NOT NULL UNIQUE,
  name       VARCHAR(150) NOT NULL,
  unit       VARCHAR(10) NOT NULL CHECK (unit IN ('UN','CX','SC','PC','CT','PR','M')),
  image_url  TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

## Campos

| Campo      | Tipo        | Obrigatório | Descrição                              |
|------------|-------------|-------------|----------------------------------------|
| sku        | TEXT        | Sim         | Código único. Usado na comparação DAV. |
| name       | VARCHAR(150)| Sim         | Nome descritivo do produto.            |
| unit       | VARCHAR(10) | Sim         | Unidade de medida (ver valores abaixo).|
| image_url  | TEXT        | Não         | URL de imagem para exibição.           |

**Unidades válidas:** `UN` (Unidade), `CX` (Caixa), `SC` (Saco), `PC` (Peça), `CT` (Cartela), `PR` (Par), `M` (Metro).

## Endpoints

Todas as rotas exigem `Authorization: Bearer <token>` com role `ADMIN`.

| Método   | Rota              | Descrição                        |
|----------|-------------------|----------------------------------|
| GET      | /products         | Lista produtos (query: `search`) |
| GET      | /products/:id     | Busca produto por ID             |
| POST     | /products         | Cria produto                     |
| PUT      | /products/:id     | Atualiza produto                 |
| DELETE   | /products/:id     | Remove produto                   |

## Corpo das requisições

**POST /products** e **PUT /products/:id**:
```json
{
  "sku": "PARF001",
  "name": "Parafuso 6mm",
  "unit": "PC",
  "imageUrl": "https://..."
}
```

**GET /products?search=parafuso** — filtra por SKU ou nome (ILIKE).

## Padrão de resposta (camelCase)

```json
{
  "id": "uuid",
  "sku": "PARF001",
  "name": "Parafuso 6mm",
  "unit": "PC",
  "imageUrl": null,
  "createdAt": "2026-05-11T10:00:00Z",
  "updatedAt": "2026-05-11T10:00:00Z"
}
```

## Regras de validação

- `sku`: obrigatório, string não vazia (após trim). UNIQUE no banco → 409 se duplicado.
- `name`: obrigatório, string não vazia, máximo 150 caracteres.
- `unit`: obrigatório, deve ser um dos 7 valores permitidos → 400 se inválido.
- `imageUrl`: opcional; string vazia é salva como `null`.
- Exclusão bloqueada por FK → retorna 409 com mensagem amigável.

## Como testar com curl

```bash
# 1. Login ADMIN
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@stockroute.com","password":"admin123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 2. Listar produtos
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/products

# 3. Criar produto
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sku":"TESTE001","name":"Produto Teste","unit":"UN","imageUrl":null}'

# 4. Editar produto (substitua <id> pelo UUID retornado)
curl -X PUT http://localhost:3000/products/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sku":"TESTE001","name":"Produto Atualizado","unit":"CX","imageUrl":null}'

# 5. Excluir produto
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/products/<id>

# 6. Testar SKU duplicado (deve retornar 409)
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sku":"TESTE001","name":"Outro","unit":"UN"}'

# 7. Testar unidade inválida (deve retornar 400)
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sku":"X","name":"X","unit":"KG"}'

# 8. Sem token (deve retornar 401)
curl http://localhost:3000/products

# 9. Busca por nome ou SKU
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/products?search=parafuso"
```

## Como usar na tela ADMIN

1. Faça login com usuário ADMIN.
2. Na sidebar, clique em **Produtos** (seção "Cadastros").
3. Use **+ Novo produto** para abrir o formulário.
4. Preencha SKU, Nome, Unidade e, opcionalmente, a URL da imagem.
5. Para editar, clique em **Editar** na linha da tabela.
6. Para excluir, clique em **Excluir** e confirme no modal.
7. Use a busca para filtrar por SKU ou nome.

## Limitações atuais

- **Upload real de imagem não implementado.** O campo `imageUrl` aceita apenas URL externa. O upload via arquivo será desenvolvido em etapa futura.
- **Paginação não implementada.** Para catálogos grandes (>500 produtos), considerar paginação ou scroll infinito.
- O campo `unit` é fixo no banco via `CHECK` constraint — para adicionar novas unidades será necessária uma migration autorizada.
