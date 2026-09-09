# Clothing2Rent PDV

Sistema PDV (Ponto de Venda) para locações presenciais da Clothing2Rent.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- Supabase (self-hosted)
- React Router v7

## Setup

```bash
npm install
npm run dev
```

## Deploy

### Hostinger VPS

```bash
chmod +x deploy.sh
./deploy.sh
```

### Manual

```bash
npm run build
# Copiar a pasta dist/ para o servidor
```

## Estrutura

```
src/
├── components/layout/   → Sidebar, Header, PageContainer
├── contexts/            → AuthContext
├── lib/supabase.ts      → Conexão Supabase
├── services/supabase.ts → Serviços centralizados
├── types/index.ts       → Tipos TypeScript
├── pages/
│   ├── Login.tsx        → Autenticação admin
│   ├── Dashboard.tsx    → Stats do dia + saldo Asaas
│   ├── POS.tsx          → Nova Locação (PDV)
│   ├── Products.tsx     → Listagem de produtos
│   ├── Customers.tsx    → Listagem de clientes
│   ├── Reservations.tsx → Lista de reservas
│   ├── Pickup.tsx       → Retiradas com checklist
│   ├── Returns.tsx      → Devoluções com inspeção
│   ├── Overdue.tsx      → Atrasos com multas
│   ├── Cashier.tsx      → Pagamentos e cauções
│   ├── Reports.tsx      → Relatórios
│   └── Settings.tsx     → Configurações (Asaas, Frete, Locação)
```

## Credenciais

- **Admin:** admin@siteesite.com.br / Admin@2026
- **Supabase Studio:** http://supabasestudio-oui3g5xbsnm4gaghfx6d0ojp.185.225.22.183.sslip.io

## Módulos

| Módulo | Descrição |
|--------|-----------|
| Dashboard | Stats do dia, saldo Asaas |
| Nova Locação | PDV com carrinho, calendário, múltiplos produtos |
| Reservas | Lista com pagamento, dias para retirada, detalhes |
| Produtos | Filtros, imagem principal |
| Clientes | CRUD completo, histórico de pedidos |
| Retiradas | Checklist com destaques (hoje/amanhã/atrasado) |
| Devoluções | Inspeção com checklist de avarias |
| Atrasos | Multas e link WhatsApp |
| Caixa | Pagamentos, cauções, histórico |
| Relatórios | Financeiro, produtos, clientes, operação |
| Configurações | Asaas, regras de locação, frete |
