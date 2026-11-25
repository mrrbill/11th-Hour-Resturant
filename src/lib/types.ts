export type OrderStatus = 'new' | 'preparing' | 'ready' | 'collected' | 'not_collected'

export interface Dish {
  id: string
  name: string
  description: string
  photo_url: string | null
  is_available: boolean
  sort_order: number
}

export interface DayHours {
  closed: boolean
  open: string // "HH:MM"
  close: string // "HH:MM"
  note: string
}

export interface Settings {
  id: number
  min_price: number
  step: number
  max_price: number
  accepting_orders: boolean
  opening_hours: DayHours[] // index 0 = Sunday
  not_collected_minutes: number
  instagram_url: string | null
  facebook_url: string | null
  website: string | null
}

export interface OrderItem {
  id?: number
  dish_id: string | null
  dish_name: string
  amount: number
}

export interface Order {
  id: string
  order_number: number
  order_date: string
  first_name: string | null
  total: number
  status: OrderStatus
  placed_at: string
  preparing_at: string | null
  ready_at: string | null
  closed_at: string | null
  order_items: OrderItem[]
}
