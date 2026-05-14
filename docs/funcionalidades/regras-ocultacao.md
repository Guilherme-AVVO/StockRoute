# Regras de ocultação

## Tipos permitidos

As regras de ocultação novas usam somente critérios simples e úteis para o DAV:

- `NAME_CONTAINS` — Nome contém
- `MANUFACTURER_NAME_CONTAINS` — Fabricante contém
- `MANUFACTURER_NAME` — Fabricante igual

Tipos antigos por SKU, descrição exata, prefixo ou referência do fabricante podem existir no banco por histórico, mas não aparecem como opção de criação/edição. A interface mostra esses registros como "Tipo antigo/incompatível".

## Por que somente nome e fabricante

Os itens não separáveis do DAV normalmente são identificáveis pelo texto do item ou pelo fabricante. Manter a regra focada em nome/fabricante reduz falsos positivos e evita dependência de SKUs internos ou referências que podem variar.

## Exemplo: INST.

Regra:

- Tipo: Nome contém
- Valor: `INST.`
- Motivo: `Ocultar itens de instalação/fábrica do picking.`

Itens como `FITA INST. BCO TX 0.7 X 22MM - TB`, `INSTALACAO PUX PERFIL` e `SERVIÇO DE INST. PORTA` são ocultados antes de entrar na revisão normal ou no picking.

## Regras por fabricante

`Fabricante contém` compara o valor informado com o nome do fabricante normalizado.

`Fabricante igual` exige igualdade exata após normalização.

Exemplo:

- Tipo: Fabricante igual
- Valor: `MOTOMADEIRAS`

Somente itens cujo fabricante normalizado seja exatamente `MOTOMADEIRAS` serão ocultados.

## Apagar regra

O endpoint `DELETE /ignored-dav-items/:id` usa soft delete:

- marca `active = false`
- preenche `deleted_at`
- impede aplicação em novos DAVs
- mantém a regra no banco para preservar auditoria de ocorrências já ocultadas

Listagens normais não retornam regras apagadas.

## Endpoints

- `GET /ignored-dav-items?includeInactive=true`
- `POST /ignored-dav-items`
- `PUT /ignored-dav-items/:id`
- `PATCH /ignored-dav-items/:id/status`
- `DELETE /ignored-dav-items/:id`

Todos exigem autenticação e perfil `ADMIN`.

## Como testar

1. Criar regra `NAME_CONTAINS` com valor `INST.`.
2. Importar ou simular item `FITA INST. BCO TX 0.7 X 22MM - TB`.
3. Confirmar que o item vai para ocultos e não aparece em revisão normal/não vinculados.
4. Criar regra `MANUFACTURER_NAME` com valor `MOTOMADEIRAS`.
5. Confirmar que item com fabricante `MOTOMADEIRAS` é ocultado.
6. Apagar uma regra e listar novamente para confirmar que ela não volta como ativa.
