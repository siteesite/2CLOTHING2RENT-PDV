-- =====================================================
-- CLOTHING2RENT PDV - Migration Completa
-- Data: 2026-09-08
-- Descrição: Tabelas novas, funções RPC, triggers e RLS
-- =====================================================

-- =====================================================
-- 1. EXTENSÕES NECESSÁRIAS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. ENUM DE STATUS
-- =====================================================

-- Status da locação (se não existir)
DO $$ BEGIN
  CREATE TYPE rental_status AS ENUM (
    'pending_payment',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'active',
    'returned',
    'inspection',
    'cleaning',
    'maintenance',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Status da transação
DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo de transação
DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM (
    'payment',
    'deposit',
    'refund',
    'damage_charge',
    'late_fee'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Método de pagamento
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'pix',
    'credit',
    'debit',
    'cash',
    'transfer',
    'payment_link'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Status do depósito/caução
DO $$ BEGIN
  CREATE TYPE deposit_status AS ENUM (
    'held',
    'returned',
    'partially_retained',
    'forfeited'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo de operação do produto
DO $$ BEGIN
  CREATE TYPE operation_type AS ENUM (
    'rental',
    'return',
    'inspection',
    'cleaning',
    'maintenance',
    'location_change'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Resultado da inspeção
DO $$ BEGIN
  CREATE TYPE inspection_result AS ENUM (
    'approved',
    'damage',
    'maintenance_needed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. TABELAS NOVAS
-- =====================================================

-- 3.1 Transações financeiras das locações
CREATE TABLE IF NOT EXISTS rental_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  transaction_type transaction_type NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_rental_transactions_rental ON rental_transactions(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_transactions_status ON rental_transactions(status);

-- 3.2 Depósitos/Cauções
CREATE TABLE IF NOT EXISTS rental_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  status deposit_status NOT NULL DEFAULT 'held',
  retained_amount NUMERIC(10,2) DEFAULT 0,
  retention_reason TEXT,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_rental_deposits_rental ON rental_deposits(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_deposits_status ON rental_deposits(status);

-- 3.3 Operações/histórico dos produtos
CREATE TABLE IF NOT EXISTS product_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL,
  operation_type operation_type NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_product_operations_product ON product_operations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_operations_rental ON product_operations(rental_id);

-- 3.4 Localização física dos produtos
CREATE TABLE IF NOT EXISTS product_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  sector TEXT,
  rack TEXT,
  position TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_locations_product ON product_locations(product_id);

-- 3.5 Inspeções de devolução
CREATE TABLE IF NOT EXISTS rental_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  result inspection_result NOT NULL,
  has_stains BOOLEAN DEFAULT false,
  has_tears BOOLEAN DEFAULT false,
  zipper_working BOOLEAN DEFAULT true,
  buttons_complete BOOLEAN DEFAULT true,
  embroidery_complete BOOLEAN DEFAULT true,
  no_damage BOOLEAN DEFAULT true,
  damage_description TEXT,
  damage_charge NUMERIC(10,2) DEFAULT 0,
  photos JSONB,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inspected_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_rental_inspections_rental ON rental_inspections(rental_id);

-- 3.6 Log de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- =====================================================
-- 4. ADICIONAR COLUNAS FALTANTES NA TABELA PRODUCTS
-- =====================================================

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS internal_code TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS operational_status TEXT DEFAULT 'available';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- =====================================================
-- 5. FUNÇÕES RPC
-- =====================================================

-- 5.1 Verificar disponibilidade de um produto em um período
CREATE OR REPLACE FUNCTION check_product_availability(
  p_product_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_rental_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_conflict_count
  FROM rentals
  WHERE product_id = p_product_id
    AND status NOT IN ('cancelled', 'completed')
    AND start_date <= p_end_date
    AND end_date >= p_start_date
    AND (p_exclude_rental_id IS NULL OR id != p_exclude_rental_id);

  RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Criar locação centralizada (evita dupla reserva)
CREATE OR REPLACE FUNCTION create_rental(
  p_customer_id UUID,
  p_product_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_total_price NUMERIC,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_available BOOLEAN;
  v_rental_id UUID;
  v_rental RECORD;
BEGIN
  -- Verificar disponibilidade
  v_available := check_product_availability(p_product_id, p_start_date, p_end_date);

  IF NOT v_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CONFLICT',
      'message', 'Produto não disponível neste período'
    );
  END IF;

  -- Criar a locação
  INSERT INTO rentals (
    customer_id,
    product_id,
    start_date,
    end_date,
    status,
    total_price,
    notes
  ) VALUES (
    p_customer_id,
    p_product_id,
    p_start_date,
    p_end_date,
    'confirmed',
    p_total_price,
    p_notes
  )
  RETURNING id INTO v_rental_id;

  -- Registrar operação no produto
  INSERT INTO product_operations (product_id, rental_id, operation_type, created_by)
  VALUES (p_product_id, v_rental_id, 'rental', p_created_by);

  -- Retornar sucesso
  SELECT jsonb_build_object(
    'success', true,
    'rental_id', id,
    'customer_id', customer_id,
    'product_id', product_id,
    'start_date', start_date,
    'end_date', end_date,
    'status', status,
    'total_price', total_price
  )
  INTO v_rental
  FROM rentals
  WHERE id = v_rental_id;

  RETURN v_rental;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 Registrar pagamento
CREATE OR REPLACE FUNCTION register_payment(
  p_rental_id UUID,
  p_amount NUMERIC,
  p_payment_method payment_method,
  p_transaction_type transaction_type DEFAULT 'payment',
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  INSERT INTO rental_transactions (
    rental_id,
    amount,
    payment_method,
    status,
    transaction_type,
    notes,
    created_by
  ) VALUES (
    p_rental_id,
    p_amount,
    p_payment_method,
    'completed',
    p_transaction_type,
    p_notes,
    p_created_by
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4 Registrar caução
CREATE OR REPLACE FUNCTION register_deposit(
  p_rental_id UUID,
  p_amount NUMERIC,
  p_payment_method payment_method,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_deposit_id UUID;
BEGIN
  INSERT INTO rental_deposits (
    rental_id,
    amount,
    payment_method,
    status,
    created_by
  ) VALUES (
    p_rental_id,
    p_amount,
    p_payment_method,
    'held',
    p_created_by
  )
  RETURNING id INTO v_deposit_id;

  RETURN v_deposit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.5 Processar devolução com inspeção
CREATE OR REPLACE FUNCTION process_return(
  p_rental_id UUID,
  p_inspection_result inspection_result,
  p_has_stains BOOLEAN DEFAULT false,
  p_has_tears BOOLEAN DEFAULT false,
  p_zipper_working BOOLEAN DEFAULT true,
  p_buttons_complete BOOLEAN DEFAULT true,
  p_embroidery_complete BOOLEAN DEFAULT true,
  p_no_damage BOOLEAN DEFAULT true,
  p_damage_description TEXT DEFAULT NULL,
  p_damage_charge NUMERIC DEFAULT 0,
  p_inspected_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_rental RECORD;
  v_inspection_id UUID;
  v_new_status TEXT;
BEGIN
  -- Buscar locação
  SELECT * INTO v_rental FROM rentals WHERE id = p_rental_id;

  IF v_rental IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rental not found');
  END IF;

  -- Registrar inspeção
  INSERT INTO rental_inspections (
    rental_id,
    result,
    has_stains,
    has_tears,
    zipper_working,
    buttons_complete,
    embroidery_complete,
    no_damage,
    damage_description,
    damage_charge,
    inspected_by
  ) VALUES (
    p_rental_id,
    p_inspection_result,
    p_has_stains,
    p_has_tears,
    p_zipper_working,
    p_buttons_complete,
    p_embroidery_complete,
    p_no_damage,
    p_damage_description,
    p_damage_charge,
    p_inspected_by
  )
  RETURNING id INTO v_inspection_id;

  -- Definir novo status baseado no resultado
  v_new_status := CASE
    WHEN p_inspection_result = 'approved' THEN 'cleaning'
    WHEN p_inspection_result = 'damage' THEN 'cleaning'
    WHEN p_inspection_result = 'maintenance_needed' THEN 'maintenance'
    ELSE 'returned'
  END;

  -- Atualizar status da locação
  UPDATE rentals SET status = v_new_status, updated_at = NOW() WHERE id = p_rental_id;

  -- Registrar operação no produto
  INSERT INTO product_operations (product_id, rental_id, operation_type, notes, created_by)
  VALUES (v_rental.product_id, p_rental_id, 'inspection', p_damage_description, p_inspected_by);

  -- Se houver dano, registrar cobrança
  IF p_damage_charge > 0 THEN
    PERFORM register_payment(p_rental_id, p_damage_charge, 'pix', 'damage_charge', p_damage_description, p_inspected_by);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'inspection_id', v_inspection_id,
    'new_status', v_new_status,
    'damage_charge', p_damage_charge
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.6 Atualizar status operacional do produto
CREATE OR REPLACE FUNCTION update_product_operational_status(
  p_product_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE products SET operational_status = p_status, updated_at = NOW() WHERE id = p_product_id;

  INSERT INTO product_operations (product_id, operation_type, notes, created_by)
  VALUES (p_product_id, 'location_change', p_notes, p_created_by);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.7 Buscar produtos com disponibilidade
CREATE OR REPLACE FUNCTION get_products_with_availability(
  p_start_date DATE,
  p_end_date DATE,
  p_category TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  brand TEXT,
  category TEXT,
  price NUMERIC,
  principal_image_url TEXT,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price,
    p.principal_image_url,
    check_product_availability(p.id, p_start_date, p_end_date) AS is_available
  FROM products p
  WHERE p.status = 'active'
    AND (p_category IS NULL OR p.category = p_category)
    AND (p_search IS NULL OR p.name ILIKE '%' || p_search || '%' OR p.brand ILIKE '%' || p_search || '%')
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.8 Dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'today_reservations', (
      SELECT COUNT(*) FROM rentals
      WHERE start_date = p_date AND status IN ('confirmed', 'preparing', 'ready_for_pickup')
    ),
    'today_pickups', (
      SELECT COUNT(*) FROM rentals
      WHERE start_date = p_date AND status = 'ready_for_pickup'
    ),
    'today_returns', (
      SELECT COUNT(*) FROM rentals
      WHERE end_date = p_date AND status = 'active'
    ),
    'overdue_count', (
      SELECT COUNT(*) FROM rentals
      WHERE end_date < p_date AND status = 'active'
    ),
    'today_revenue', (
      SELECT COALESCE(SUM(amount), 0) FROM rental_transactions
      WHERE DATE(created_at) = p_date AND status = 'completed' AND transaction_type = 'payment'
    ),
    'pending_amount', (
      SELECT COALESCE(SUM(r.total_price), 0) FROM rentals r
      WHERE r.status IN ('confirmed', 'preparing', 'ready_for_pickup')
      AND r.total_price > COALESCE((
        SELECT SUM(rt.amount) FROM rental_transactions rt
        WHERE rt.rental_id = r.id AND rt.status = 'completed' AND rt.transaction_type = 'payment'
      ), 0)
    ),
    'total_products', (SELECT COUNT(*) FROM products),
    'active_rentals', (SELECT COUNT(*) FROM rentals WHERE status = 'active')
  ) INTO v_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. TRIGGERS DE AUDITORIA
-- =====================================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers de auditoria
DROP TRIGGER IF EXISTS audit_rentals ON rentals;
CREATE TRIGGER audit_rentals
  AFTER INSERT OR UPDATE OR DELETE ON rentals
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_rental_transactions ON rental_transactions;
CREATE TRIGGER audit_rental_transactions
  AFTER INSERT OR UPDATE OR DELETE ON rental_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_rental_deposits ON rental_deposits;
CREATE TRIGGER audit_rental_deposits
  AFTER INSERT OR UPDATE OR DELETE ON rental_deposits
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- =====================================================
-- 7. RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE rental_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies para service_role (acesso total)
CREATE POLICY "service_role_all_rental_transactions" ON rental_transactions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_rental_deposits" ON rental_deposits
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_product_operations" ON product_operations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_product_locations" ON product_locations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_rental_inspections" ON rental_inspections
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_audit_logs" ON audit_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Policies para anon (leitura apenas)
CREATE POLICY "anon_read_rental_transactions" ON rental_transactions
  FOR SELECT USING (true);

CREATE POLICY "anon_read_rental_deposits" ON rental_deposits
  FOR SELECT USING (true);

CREATE POLICY "anon_read_product_operations" ON product_operations
  FOR SELECT USING (true);

CREATE POLICY "anon_read_product_locations" ON product_locations
  FOR SELECT USING (true);

CREATE POLICY "anon_read_rental_inspections" ON rental_inspections
  FOR SELECT USING (true);

CREATE POLICY "anon_read_audit_logs" ON audit_logs
  FOR SELECT USING (true);

-- =====================================================
-- 8. ATUALIZAR STATUS EXISTENTES
-- =====================================================

-- Converter status text da tabela rentals para o enum (se necessário)
-- Nota: A coluna status já existe como text. O enum é apenas para referência.
-- As funções RPC usam o enum internamente.

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
