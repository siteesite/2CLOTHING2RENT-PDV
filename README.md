# CLOTHING2RENT PDV

Sistema PDV (Ponto de Venda) para locações presenciais da Clothing2Rent.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Supabase (self-hosted)
- React Router v7

## Setup

```bash
npm install
npm run dev
```

## Estrutura

```
src/
├── components/layout/   → Sidebar, Header, PageContainer
├── lib/supabase.ts      → Conexão Supabase
├── services/supabase.ts → Serviços centralizados
├── types/index.ts       → Tipos TypeScript
├── pages/
│   ├── Dashboard.tsx    → Stats do dia
│   ├── POS.tsx          → Nova Locação (PDV)
│   ├── Products.tsx     → Listagem de produtos
│   ├── Customers.tsx    → Listagem de clientes
│   ├── Reservations.tsx → Lista de reservas
│   ├── Pickup.tsx       → Retiradas com checklist
│   ├── Returns.tsx      → Devoluções com inspeção
│   └── Overdue.tsx      → Atrasos com multas
```

## Migration SQL

O arquivo `supabase/migrations/001_pdv_tables_and_functions.sql` contém:

- Tabelas: `rental_transactions`, `rental_deposits`, `product_operations`, `product_locations`, `rental_inspections`, `audit_logs`
- Funções RPC: `create_rental()`, `check_product_availability()`, `register_payment()`, `register_deposit()`, `process_return()`, `get_dashboard_stats()`
- Triggers de auditoria
- RLS policies

Aplicar manualmente no Studio do Supabase.

## Banco de Dados

O PDV utiliza o mesmo banco do e-commerce (Supabase self-hosted). Tabelas compartilhadas:

- `products`
- `customers`
- `orders`
- `rentals`
