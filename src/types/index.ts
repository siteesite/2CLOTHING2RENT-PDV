export interface Product {
  id: string
  handle: string
  name: string
  description_html: string | null
  vendor: string | null
  brand: string | null
  category: string | null
  subcategory: string | null
  status: string | null
  price: number | null
  compare_at_price: number | null
  images: any
  tags: string[] | null
  sizes: any
  rental_periods: any
  principal_image_url: string | null
  created_at: string
  updated_at: string
  synced_at: string | null
  internal_code?: string
  location_sector?: string
  location_rack?: string
  location_position?: string
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
  created_at: string
  created_by: string | null
}

export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'cash' | 'transfer' | 'payment_link'
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type TransactionType = 'payment' | 'deposit' | 'refund' | 'damage_charge' | 'late_fee'

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
  rented_products: number
  available_products: number
  cleaning_products: number
  maintenance_products: number
}
