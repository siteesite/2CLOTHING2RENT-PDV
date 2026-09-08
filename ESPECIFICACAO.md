# CLOTHING2RENT PDV

## Especificação Completa do Projeto

**Projeto:** `2CLOTHING2RENT-PDV`
**Projeto de referência:** `2CLOTHING2RENT-main`
**Objetivo:** Criar um sistema PDV (Ponto de Venda) para locações presenciais na loja Clothing2Rent, utilizando o mesmo banco de dados, produtos, clientes e reservas do e-commerce.

---

# PARTE 1 — VISÃO GERAL

## 1.1 Objetivo

O `2CLOTHING2RENT-PDV` será uma aplicação independente do site principal, desenvolvida para facilitar o atendimento presencial e toda a operação diária de locação.

O sistema permitirá:

- Realizar novas locações presencialmente.
- Consultar os mesmos produtos do site.
- Consultar preços e períodos de locação.
- Consultar disponibilidade em tempo real.
- Criar reservas no mesmo banco de dados.
- Bloquear automaticamente as datas no site.
- Buscar e cadastrar clientes.
- Controlar retiradas.
- Controlar devoluções.
- Registrar pagamentos.
- Controlar pagamentos parciais.
- Controlar cauções.
- Registrar multas e avarias.
- Acompanhar atrasos.
- Controlar o fluxo operacional das peças.

## 1.2 Princípio principal

O PDV não terá um banco de dados separado.

A arquitetura será:

```text
                    SUPABASE
                        │
        ┌───────────────┴────────────────┐
        │                                │
        ▼                                ▼
2CLOTHING2RENT-main              2CLOTHING2RENT-PDV
SITE ONLINE                       LOJA FÍSICA
        │                                │
        ├──────── products ──────────────┤
        ├──────── customers ─────────────┤
        ├──────── orders ────────────────┤
        └──────── rentals ───────────────┘
```

Toda reserva criada no PDV deverá aparecer imediatamente no site.

Toda reserva criada no site deverá aparecer imediatamente no PDV.

---

# PARTE 2 — TECNOLOGIAS

## 2.1 Stack recomendada

O novo projeto deverá manter compatibilidade com o projeto existente.

```text
React
Vite
TypeScript
Tailwind CSS
Supabase
React Router
date-fns
React Day Picker
PWA
```

## 2.2 Estrutura

```text
2CLOTHING2RENT-PDV
│
├── src
│   ├── pages
│   ├── components
│   ├── contexts
│   ├── hooks
│   ├── services
│   ├── types
│   ├── utils
│   └── lib
│
├── public
├── package.json
├── vite.config.ts
└── README.md
```

---

# PARTE 3 — IDENTIDADE VISUAL

## 3.1 Regra de design

O PDV deve utilizar a mesma identidade visual da Clothing2Rent.

Entretanto, não deve copiar a experiência do e-commerce.

O site é voltado para:

```text
Moda
Inspiração
Experiência visual
Conversão online
```

O PDV deve ser voltado para:

```text
Velocidade
Operação
Atendimento
Produtividade
Controle
```

## 3.2 Diretrizes

- Manter tipografia e identidade visual compatíveis.
- Utilizar fotos grandes dos produtos.
- Priorizar informações importantes.
- Evitar telas excessivamente carregadas.
- Permitir operação rápida com mouse e teclado.
- Ter boa utilização em monitores de balcão.
- Possuir layout responsivo para tablets.

---

# PARTE 4 — MÓDULOS PRINCIPAIS

## 4.1 Menu

```text
🏠 Dashboard

🛍 Nova Locação

📅 Reservas

👗 Produtos

👤 Clientes

📦 Retiradas

↩ Devoluções

⚠ Atrasos

💰 Caixa

📊 Relatórios

⚙ Configurações
```

---

# PARTE 5 — DASHBOARD

O dashboard será a tela inicial do sistema.

## Informações principais

- Reservas do dia.
- Retiradas do dia.
- Devoluções do dia.
- Produtos alugados.
- Produtos disponíveis.
- Produtos em higienização.
- Produtos em manutenção.
- Locações atrasadas.
- Valor recebido no dia.
- Valores pendentes.

Exemplo:

```text
┌───────────────────────────────────────────────┐
│ CLOTHING2RENT PDV                            │
├───────────────────────────────────────────────┤
│ Reservas Hoje       12                        │
│ Retiradas Hoje       8                        │
│ Devoluções Hoje      5                        │
│ Atrasos              2                        │
├───────────────────────────────────────────────┤
│ Faturamento Hoje                              │
│ R$ 4.250,00                                   │
└───────────────────────────────────────────────┘
```

---

# PARTE 6 — NOVA LOCAÇÃO / PDV

Esta será a principal tela operacional.

## Fluxo

```text
CLIENTE
   ↓
PRODUTOS
   ↓
DATAS
   ↓
DISPONIBILIDADE
   ↓
CARRINHO
   ↓
DESCONTO
   ↓
PAGAMENTO
   ↓
CONFIRMAR
```

## Cliente

Permitir busca por:

- Nome.
- Telefone.
- CPF.
- E-mail.

Caso não exista:

```text
+ NOVO CLIENTE
```

O cadastro rápido deverá conter apenas os dados necessários para iniciar a operação.

## Produto

Buscar por:

- Nome.
- Código interno.
- SKU.
- Marca.
- Categoria.
- Tamanho.
- Cor.

---

# PARTE 7 — PRODUTOS

O PDV deverá utilizar diretamente os produtos existentes no banco.

Cada produto deve apresentar:

- Foto.
- Nome.
- Marca.
- Tamanho.
- Cor.
- Categoria.
- Código interno.
- Preço.
- Status.
- Próximas reservas.

## Código interno

Recomenda-se adicionar um identificador físico:

```text
C2R-000001
C2R-000002
C2R-000003
```

Esse código poderá ser usado com:

- Leitor USB.
- Código de barras.
- QR Code.
- Busca rápida.

---

# PARTE 8 — DISPONIBILIDADE E CALENDÁRIO

A disponibilidade deve ser calculada utilizando o período da locação.

Não utilizar apenas:

```text
available = true
```

Uma peça pode estar disponível em determinado período e reservada em outro.

Exemplo:

```text
Produto X

10/09 → 13/09   RESERVADO
15/09 → 18/09   DISPONÍVEL
20/09 → 23/09   RESERVADO
```

## Regra de conflito

Uma reserva conflita quando:

```text
nova_data_inicio <= reserva_existente.end_date

E

nova_data_fim >= reserva_existente.start_date
```

## Status visual

```text
🟢 Disponível
🔴 Reservado
🔵 Alugado
🟡 Em preparação
🟠 Higienização
⚫ Manutenção
```

---

# PARTE 9 — REGRA CENTRAL DE RESERVA

Não permitir que site e PDV implementem regras diferentes.

Criar uma regra central no Supabase.

Sugestão:

```text
create_rental()
```

Fluxo:

```text
SOLICITA RESERVA
        ↓
VERIFICA DISPONIBILIDADE
        ↓
┌───────┴────────┐
│                │
❌ CONFLITO       🟢 DISPONÍVEL
                     ↓
              CRIA RESERVA
                     ↓
              BLOQUEIA DATAS
                     ↓
                 SUCESSO
```

Essa regra deverá ser utilizada pelo:

- Site.
- PDV.
- Futuras integrações.

## Objetivo

Evitar dupla reserva.

Exemplo:

```text
Cliente no site
        +
Atendente no PDV
        ↓
MESMO PRODUTO
MESMAS DATAS
```

Apenas uma reserva poderá ser confirmada.

---

# PARTE 10 — CARRINHO

O carrinho permitirá múltiplos produtos.

Exemplo:

```text
CLIENTE
Maria Silva

PRODUTOS

Vestido PatBo
15/09 → 18/09
R$ 750,00

Bolsa Cult Gaia
15/09 → 18/09
R$ 275,00

-----------------

Subtotal
R$ 1.025,00

Desconto
R$ 50,00

TOTAL
R$ 975,00
```

---

# PARTE 11 — PREÇOS

O PDV deverá utilizar a mesma lógica de preços do site.

Exemplo:

```text
3 dias
R$ 750

5 dias
R$ 850

7 dias
R$ 950

10 dias
R$ 1.100
```

## Descontos

Implementar permissões:

```text
ATENDENTE
Sem desconto manual

GERENTE
Pode aplicar desconto

ADMINISTRADOR
Acesso total
```

Toda alteração manual deverá registrar:

- Usuário.
- Data.
- Valor original.
- Valor final.
- Motivo.

---

# PARTE 12 — PAGAMENTOS

Criar uma estrutura financeira própria para locações.

## Formas

- PIX.
- Crédito.
- Débito.
- Dinheiro.
- Transferência.
- Link de pagamento.

## Pagamento parcial

Exemplo:

```text
Valor total
R$ 975,00

Entrada
R$ 300,00

Saldo
R$ 675,00

Status
PENDENTE PARCIAL
```

## Tabela recomendada

```text
rental_transactions

id
rental_id
amount
payment_method
status
transaction_type
created_at
created_by
```

### transaction_type

```text
payment
deposit
refund
damage_charge
late_fee
```

---

# PARTE 13 — CAUÇÃO

Implementar controle de garantia.

```text
Valor da caução
R$ 500,00

Forma
PIX

Status
HELD
```

Na devolução:

```text
RETURNED
```

Em caso de desconto:

```text
PARTIALLY_RETAINED
```

Registrar sempre:

- Motivo.
- Valor.
- Usuário responsável.
- Data.

---

# PARTE 14 — STATUS DA LOCAÇÃO

Manter compatibilidade com os status existentes.

Sugestão operacional:

```text
pending_payment
confirmed
preparing
ready_for_pickup
active
returned
inspection
cleaning
maintenance
completed
cancelled
```

Fluxo:

```text
CONFIRMADA
     ↓
EM PREPARAÇÃO
     ↓
PRONTA PARA RETIRADA
     ↓
ALUGADA
     ↓
DEVOLVIDA
     ↓
INSPEÇÃO
     ↓
HIGIENIZAÇÃO
     ↓
DISPONÍVEL
```

Recomenda-se separar:

```text
STATUS DA RESERVA
```

de:

```text
STATUS OPERACIONAL DA PEÇA
```

---

# PARTE 15 — RETIRADAS

Tela com todas as retiradas do dia.

Exemplo:

```text
RETIRADAS DE HOJE

14:00
Maria Silva

Vestido PatBo

STATUS
PRONTA PARA RETIRADA

[ ABRIR ]
```

Checklist:

```text
✓ Pagamento conferido
✓ Produtos separados
✓ Caução registrada
✓ Cliente identificado
```

Após confirmação:

```text
STATUS → ACTIVE
```

---

# PARTE 16 — DEVOLUÇÕES

Ao devolver:

```text
DEVOLVIDO
    ↓
INSPEÇÃO
```

Checklist:

```text
☐ Sem manchas
☐ Sem rasgos
☐ Zíper funcionando
☐ Botões completos
☐ Bordados completos
☐ Sem danos
```

Possíveis resultados:

```text
✓ Aprovado
→ Higienização

⚠ Avaria
→ Registrar cobrança

🔧 Problema
→ Manutenção
```

---

# PARTE 17 — HIGIENIZAÇÃO E MANUTENÇÃO

Uma peça devolvida não deve ficar automaticamente disponível.

Fluxo:

```text
DEVOLVIDA
   ↓
INSPEÇÃO
   ↓
HIGIENIZAÇÃO
   ↓
DISPONÍVEL
```

Em caso de problema:

```text
INSPEÇÃO
   ↓
MANUTENÇÃO
   ↓
DISPONÍVEL
```

---

# PARTE 18 — ATRASOS

Tela exclusiva:

```text
DEVOLUÇÕES EM ATRASO
```

Informações:

- Cliente.
- Produto.
- Data prevista.
- Dias de atraso.
- Multa acumulada.
- Contato.

Ações:

```text
[ WhatsApp ]

[ Registrar pagamento ]

[ Abrir reserva ]
```

---

# PARTE 19 — RESERVA DE PROVA

Funcionalidade recomendada para atendimento presencial.

```text
ATENDIMENTO

Cliente:
Maria Silva

Produtos separados:

Vestido A
Vestido B
Vestido C

STATUS
EM PROVA
```

Depois:

```text
[ DEVOLVER AO ESTOQUE ]

ou

[ CONVERTER EM LOCAÇÃO ]
```

---

# PARTE 20 — BLOQUEIO TEMPORÁRIO

Durante o atendimento:

```text
PRODUTO ADICIONADO AO CARRINHO

BLOQUEIO TEMPORÁRIO
15 minutos
```

Após expiração:

```text
BLOQUEIO REMOVIDO
```

Esse recurso deve ser implementado posteriormente, com regras claras para não prejudicar reservas online.

---

# PARTE 21 — HISTÓRICO DO PRODUTO

Cada produto deverá possuir histórico operacional.

```text
01/08
ALUGADO

04/08
DEVOLVIDO

05/08
HIGIENIZADO

10/08
RESERVADO

15/08
ALUGADO
```

Também mostrar:

```text
Número de locações

Receita gerada

Última higienização

Última manutenção

Próxima reserva
```

---

# PARTE 22 — LOCALIZAÇÃO FÍSICA

Recomenda-se adicionar localização da peça.

```text
Setor
Vestidos

Arara
A3

Posição
12
```

Exemplo:

```text
Vestido PatBo

📍 Arara A3
📍 Posição 12
```

---

# PARTE 23 — DASHBOARD FINANCEIRO

Informações diárias:

```text
LOCAÇÕES
R$ 4.250

RECEBIDO
R$ 3.200

PENDENTE
R$ 1.050

CAUÇÕES
R$ 2.000
```

Relatórios mensais:

- Receita.
- Quantidade de locações.
- Ticket médio.
- Produto mais alugado.
- Cliente recorrente.
- Atrasos.
- Produtos com maior receita.

---

# PARTE 24 — RELATÓRIOS

Implementar:

## Produtos

- Mais alugados.
- Menos alugados.
- Maior receita.
- Menor receita.

## Clientes

- Clientes recorrentes.
- Maior valor gasto.
- Quantidade de locações.

## Financeiro

- Receita por período.
- Pagamentos pendentes.
- Cauções retidas.
- Multas.
- Descontos.

## Operação

- Peças alugadas.
- Peças em higienização.
- Peças em manutenção.
- Locações atrasadas.

---

# PARTE 25 — ESTRUTURA DE PASTAS

```text
src/
│
├── pages/
│   ├── Dashboard.tsx
│   ├── POS.tsx
│   ├── Reservations.tsx
│   ├── Calendar.tsx
│   ├── Products.tsx
│   ├── Customers.tsx
│   ├── Pickup.tsx
│   ├── Returns.tsx
│   ├── Cashier.tsx
│   ├── Reports.tsx
│   └── Settings.tsx
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── PageContainer.tsx
│   │
│   ├── pos/
│   │   ├── ProductSearch.tsx
│   │   ├── POSCart.tsx
│   │   ├── CustomerSearch.tsx
│   │   └── PaymentModal.tsx
│   │
│   ├── products/
│   │   ├── ProductCard.tsx
│   │   └── ProductAvailability.tsx
│   │
│   ├── rentals/
│   │   ├── RentalCalendar.tsx
│   │   └── RentalStatus.tsx
│   │
│   └── common/
│       ├── Loading.tsx
│       └── ConfirmDialog.tsx
│
├── contexts/
│   ├── AuthContext.tsx
│   └── POSContext.tsx
│
├── services/
│   ├── products.ts
│   ├── rentals.ts
│   ├── customers.ts
│   ├── payments.ts
│   └── reports.ts
│
├── hooks/
│
├── types/
│
└── lib/
    └── supabase.ts
```

---

# PARTE 26 — SEGURANÇA

Implementar permissões.

## Atendente

```text
Criar locação
Buscar produtos
Buscar clientes
Registrar pagamento
Registrar retirada
Registrar devolução
```

## Gerente

```text
Todas as permissões do atendente
Descontos
Cancelamentos
Relatórios
Ajustes operacionais
```

## Administrador

```text
Acesso completo
```

Todas as ações críticas devem registrar:

- Usuário.
- Data.
- Ação.
- Valores anteriores.
- Valores novos.

---

# PARTE 27 — FASES DE IMPLEMENTAÇÃO

## FASE 1 — FUNDAÇÃO

```text
[ ] Criar projeto 2CLOTHING2RENT-PDV
[ ] Configurar React
[ ] Configurar Supabase existente
[ ] Configurar autenticação
[ ] Criar layout
[ ] Criar menu
```

## FASE 2 — PRODUTOS

```text
[ ] Listagem
[ ] Busca
[ ] Filtros
[ ] Fotos
[ ] Disponibilidade
[ ] Calendário
```

## FASE 3 — CLIENTES

```text
[ ] Busca
[ ] Cadastro rápido
[ ] Histórico
```

## FASE 4 — PDV

```text
[ ] Carrinho
[ ] Datas
[ ] Produtos múltiplos
[ ] Preços
[ ] Descontos
[ ] Confirmação
```

## FASE 5 — RESERVAS

```text
[ ] Lista
[ ] Calendário
[ ] Detalhes
[ ] Status
```

## FASE 6 — RETIRADAS E DEVOLUÇÕES

```text
[ ] Retirada
[ ] Checklist
[ ] Devolução
[ ] Inspeção
[ ] Avarias
```

## FASE 7 — FINANCEIRO

```text
[ ] Pagamentos
[ ] Pagamentos parciais
[ ] Cauções
[ ] Multas
```

## FASE 8 — RELATÓRIOS

```text
[ ] Financeiro
[ ] Produtos
[ ] Clientes
[ ] Operação
```

---

# PARTE 28 — REGRAS CRÍTICAS

## Regra 1

Nunca duplicar produtos entre site e PDV.

## Regra 2

Nunca criar uma tabela de reservas exclusiva para o PDV sem necessidade.

## Regra 3

Toda reserva confirmada no PDV deve bloquear imediatamente a data no site.

## Regra 4

Toda reserva online deve aparecer imediatamente no PDV.

## Regra 5

A verificação de disponibilidade deve ser centralizada no banco.

## Regra 6

Não confiar apenas na validação do frontend.

## Regra 7

Toda operação financeira deve possuir histórico.

## Regra 8

Uma peça devolvida não significa automaticamente uma peça disponível.

---

# PARTE 29 — OBJETIVO FINAL

O sistema final deverá funcionar como um centro operacional completo.

```text
                    CLOTHING2RENT

                         │

        ┌────────────────┴────────────────┐
        │                                 │

        SITE                              PDV

        │                                 │

        ▼                                 ▼

   RESERVAS ONLINE                LOCAÇÕES PRESENCIAIS

        │                                 │
        └────────────────┬────────────────┘
                         │
                         ▼
                  MESMO BANCO
                         │
                         ▼
              DISPONIBILIDADE CENTRAL
```

O objetivo é permitir que a loja trabalhe com um único ecossistema de dados, evitando:

- Produtos duplicados.
- Reservas duplicadas.
- Datas conflitantes.
- Clientes duplicados.
- Processos manuais.
- Falta de controle sobre as peças.

---

# PARTE 30 — PRÓXIMO PASSO TÉCNICO

Antes da implementação definitiva, realizar uma auditoria do Supabase utilizado pelo projeto.

Mapear:

```text
[ ] Tabelas existentes
[ ] Colunas
[ ] Chaves estrangeiras
[ ] Índices
[ ] Views
[ ] Funções RPC
[ ] Triggers
[ ] Policies RLS
[ ] Enum de status
```

Após esse mapeamento, definir:

```text
TABELAS REUTILIZADAS

products
customers
orders
rentals

NOVAS ESTRUTURAS POSSÍVEIS

rental_transactions
rental_deposits
product_operations
product_locations
rental_inspections
audit_logs
```

Nenhuma nova tabela deverá ser criada sem verificar primeiro a estrutura real do banco existente.

---

# CONCLUSÃO

O `2CLOTHING2RENT-PDV` será um projeto independente no frontend, porém totalmente integrado ao ecossistema atual.

O princípio central será:

> **UM ÚNICO BANCO DE DADOS, UMA ÚNICA VERDADE SOBRE PRODUTOS E RESERVAS, DOIS CANAIS DE OPERAÇÃO: SITE E LOJA FÍSICA.**

O projeto deverá priorizar velocidade no atendimento, segurança contra conflitos de reservas e controle completo do ciclo de vida da locação.
