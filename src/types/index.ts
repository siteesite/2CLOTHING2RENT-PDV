export interface Product {
  id: string
  handle: string
  name: string
  description_html: string | null
  brand: string | null
  category: string | null
  status: string | null
  sku: string | null
  price: number | null
  compare_at_price: number | null
  cost_per_item: number | null
  stock_qty: number | null
  barcode: string | null
  image_url: string | null
  extra_images: string[] | null
  seo_title: string | null
  seo_description: string | null
  size: string | null
  color: string | null
  tags: string[] | null
  metafields: any
  created_at: string
  updated_at: string
  internal_code?: string
  operational_status?: string
}

export interface Customer {
  id: string
  customer_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  accepts_email_marketing: boolean | null
  accepts_sms_marketing: boolean | null
  total_spent: number | null
  total_orders: number | null
  note: string | null
  tax_exempt: boolean | null
  tags: string[] | null
  default_address: any
  created_at: string
  updated_at: string
}

export interface Rental {
  id: string
  customer_id: string
  product_id: string
  start_date: string
  end_date: string
  status: RentalStatus
  total_price: number | null
  notes: string | null
  created_at: string
  updated_at: string
  customer?: Customer
  product?: Product
}

export type RentalStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'active'
  | 'returned'
  | 'inspection'
  | 'cleaning'
  | 'maintenance'
  | 'completed'
  | 'cancelled'

export interface RentalTransaction {
  id: string
  rental_id: string
  amount: number
  payment_method: PaymentMethod
  status: TransactionStatus
  transaction_type: TransactionType
  notes: string | null
  created_at: string
  created_by: string | null
}

export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'cash' | 'transfer' | 'payment_link'
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type TransactionType = 'payment' | 'deposit' | 'refund' | 'damage_charge' | 'late_fee'

export interface RentalDeposit {
  id: string
  rental_id: string
  amount: number
  payment_method: PaymentMethod
  status: DepositStatus
  retained_amount: number
  retention_reason: string | null
  returned_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export type DepositStatus = 'held' | 'returned' | 'partially_retained' | 'forfeited'

export interface ProductOperation {
  id: string
  product_id: string
  rental_id: string | null
  operation_type: OperationType
  notes: string | null
  created_at: string
  created_by: string | null
}

export type OperationType = 'rental' | 'return' | 'inspection' | 'cleaning' | 'maintenance' | 'location_change'

export interface ProductLocation {
  id: string
  product_id: string
  sector: string | null
  rack: string | null
  position: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RentalInspection {
  id: string
  rental_id: string
  result: InspectionResult
  has_stains: boolean
  has_tears: boolean
  zipper_working: boolean
  buttons_complete: boolean
  embroidery_complete: boolean
  no_damage: boolean
  damage_description: string | null
  damage_charge: number
  photos: any
  inspected_at: string
  inspected_by: string | null
}

export type InspectionResult = 'approved' | 'damage' | 'maintenance_needed'

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: string
  old_values: any
  new_values: any
  user_id: string | null
  created_at: string
}

export interface CartItem {
  product: Product
  start_date: string
  end_date: string
  days: number
  price: number
}

export interface Cart {
  customer: Customer | null
  items: CartItem[]
  discount: number
  discount_reason: string
  subtotal: number
  total: number
}

export interface DashboardStats {
  today_reservations: number
  today_pickups: number
  today_returns: number
  overdue_count: number
  today_revenue: number
  pending_amount: number
  total_products: number
  active_rentals: number
}

export interface CreateRentalResponse {
  success: boolean
  error?: string
  message?: string
  rental_id?: string
  customer_id?: string
  product_id?: string
  start_date?: string
  end_date?: string
  status?: string
  total_price?: number
}
