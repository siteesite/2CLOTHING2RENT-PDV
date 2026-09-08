import { supabase } from '../lib/supabase'
import type {
  Product,
  Customer,
  Rental,
  RentalTransaction,
  RentalDeposit,
  ProductOperation,
  ProductLocation,
  RentalInspection,
  CreateRentalResponse,
  DashboardStats,
  PaymentMethod,
  TransactionType,
  InspectionResult,
} from '../types'

// =====================================================
// PRODUCTS
// =====================================================

export async function getProducts(search?: string, category?: string) {
  let query = supabase.from('products').select('*').order('name')

  if (search) {
    query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,handle.ilike.%${search}%`)
  }

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Product[]
}

export async function getProduct(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_locations(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Product & { product_locations: ProductLocation[] }
}

export async function getProductAvailability(productId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .rpc('check_product_availability', {
      p_product_id: productId,
      p_start_date: startDate,
      p_end_date: endDate,
    })

  if (error) throw error
  return data as boolean
}

export async function getProductsWithAvailability(startDate: string, endDate: string, category?: string, search?: string) {
  const { data, error } = await supabase
    .rpc('get_products_with_availability', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_category: category || null,
      p_search: search || null,
    })

  if (error) throw error
  return data
}

// =====================================================
// CUSTOMERS
// =====================================================

export async function getCustomers(search?: string) {
  let query = supabase.from('customers').select('*').order('first_name')

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data as Customer[]
}

export async function getCustomer(id: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Customer
}

export async function createCustomer(customer: Partial<Customer>) {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single()

  if (error) throw error
  return data as Customer
}

// =====================================================
// RENTALS
// =====================================================

export async function getRentals(status?: string) {
  let query = supabase
    .from('rentals')
    .select('*, customers(*), products(*)')
    .order('start_date', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return data as (Rental & { customers: Customer; products: Product })[]
}

export async function getRental(id: string) {
  const { data, error } = await supabase
    .from('rentals')
    .select('*, customers(*), products(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Rental & { customers: Customer; products: Product }
}

export async function createRental(
  customerId: string,
  productId: string,
  startDate: string,
  endDate: string,
  totalPrice: number,
  notes?: string,
  createdBy?: string
): Promise<CreateRentalResponse> {
  const { data, error } = await supabase
    .rpc('create_rental', {
      p_customer_id: customerId,
      p_product_id: productId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_total_price: totalPrice,
      p_notes: notes || null,
      p_created_by: createdBy || null,
    })

  if (error) throw error
  return data as CreateRentalResponse
}

export async function updateRentalStatus(id: string, status: string) {
  const { error } = await supabase
    .from('rentals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// =====================================================
// TRANSACTIONS (PAYMENTS)
// =====================================================

export async function getTransactions(rentalId?: string) {
  let query = supabase
    .from('rental_transactions')
    .select('*')
    .order('created_at', { ascending: false })

  if (rentalId) {
    query = query.eq('rental_id', rentalId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as RentalTransaction[]
}

export async function registerPayment(
  rentalId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  transactionType: TransactionType = 'payment',
  notes?: string,
  createdBy?: string
) {
  const { data, error } = await supabase
    .rpc('register_payment', {
      p_rental_id: rentalId,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_transaction_type: transactionType,
      p_notes: notes || null,
      p_created_by: createdBy || null,
    })

  if (error) throw error
  return data as string
}

// =====================================================
// DEPOSITS (CAUÇÃO)
// =====================================================

export async function getDeposits(rentalId?: string) {
  let query = supabase
    .from('rental_deposits')
    .select('*')
    .order('created_at', { ascending: false })

  if (rentalId) {
    query = query.eq('rental_id', rentalId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as RentalDeposit[]
}

export async function registerDeposit(
  rentalId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  createdBy?: string
) {
  const { data, error } = await supabase
    .rpc('register_deposit', {
      p_rental_id: rentalId,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_created_by: createdBy || null,
    })

  if (error) throw error
  return data as string
}

// =====================================================
// INSPECTIONS
// =====================================================

export async function getInspections(rentalId?: string) {
  let query = supabase
    .from('rental_inspections')
    .select('*')
    .order('inspected_at', { ascending: false })

  if (rentalId) {
    query = query.eq('rental_id', rentalId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as RentalInspection[]
}

export async function processReturn(
  rentalId: string,
  result: InspectionResult,
  options: {
    has_stains?: boolean
    has_tears?: boolean
    zipper_working?: boolean
    buttons_complete?: boolean
    embroidery_complete?: boolean
    no_damage?: boolean
    damage_description?: string
    damage_charge?: number
    inspected_by?: string
  } = {}
) {
  const { data, error } = await supabase
    .rpc('process_return', {
      p_rental_id: rentalId,
      p_inspection_result: result,
      p_has_stains: options.has_stains || false,
      p_has_tears: options.has_tears || false,
      p_zipper_working: options.zipper_working ?? true,
      p_buttons_complete: options.buttons_complete ?? true,
      p_embroidery_complete: options.embroidery_complete ?? true,
      p_no_damage: options.no_damage ?? true,
      p_damage_description: options.damage_description || null,
      p_damage_charge: options.damage_charge || 0,
      p_inspected_by: options.inspected_by || null,
    })

  if (error) throw error
  return data
}

// =====================================================
// PRODUCT OPERATIONS
// =====================================================

export async function getProductOperations(productId: string) {
  const { data, error } = await supabase
    .from('product_operations')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as ProductOperation[]
}

// =====================================================
// DASHBOARD
// =====================================================

export async function getDashboardStats(date?: string): Promise<DashboardStats> {
  const { data, error } = await supabase
    .rpc('get_dashboard_stats', {
      p_date: date || new Date().toISOString().split('T')[0],
    })

  if (error) throw error
  return data as DashboardStats
}
