# StockRoute

StockRoute é um sistema web de gerenciamento de pedidos e separação de mercadorias (Picking) desenvolvido para digitalizar e otimizar operações de estoque e expedição.

O sistema foi projetado para substituir processos manuais baseados em PDFs impressos e marcações físicas, oferecendo rastreabilidade completa, validação operacional e controle em tempo real do fluxo de separação de pedidos.

## Principais funcionalidades

- Autenticação JWT com controle de permissões
- Gestão de usuários (ADMIN e ESTOQUISTA)
- Upload e processamento automático de pedidos em PDF (DAV)
- Extração automática de itens via parsing de PDF
- Catálogo de produtos com imagens
- Fluxo completo de separação (Picking)
- Evidência fotográfica obrigatória para coleta de itens
- Controle de itens não encontrados
- Dashboard operacional em tempo real
- Histórico completo e rastreabilidade de pedidos
- Interface mobile-first para uso em galpão/logística

## Tecnologias utilizadas

### Backend
- Node.js
- Express
- PostgreSQL
- pg (node-postgres)
- JWT
- bcrypt
- Multer
- pdf-parse

### Frontend
- React
- Vite
- CSS padrão

### Infraestrutura
- Docker
- pgAdmin
- PostgreSQL

## Objetivo do projeto

O principal objetivo do StockRoute é reduzir falhas operacionais em processos de separação de pedidos, garantindo que nenhum item seja ignorado durante a coleta e fornecendo rastreabilidade completa das operações logísticas.

## Arquitetura

O projeto segue uma arquitetura modular baseada em:
- Controllers
- Services
- Middlewares
- SQL puro com PostgreSQL
- Estrutura mobile-first
- API REST

## Como executar localmente

### Pré-requisitos

- Docker e Docker Compose
- Node.js 18+

### Passos

1. Clone o repositório:
   ```bash
   git clone https://github.com/Guilherme-AVVO/StockRoute.git
   cd StockRoute
   ```

2. Suba o banco de dados com Docker:
   ```bash
   docker-compose up -d
   ```

3. Configure e inicie o backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edite o arquivo .env com suas configurações
   npm run dev
   ```

4. Em outro terminal, configure e inicie o frontend:
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm run dev
   ```

O backend estará disponível em `http://localhost:3000` e o frontend em `http://localhost:5173`.

## Status

🚧 Em desenvolvimento
