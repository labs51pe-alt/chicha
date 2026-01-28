
export interface ItemVariant {
  id: string;
  product_id?: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  category_id?: string;
  category?: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_popular?: boolean;
  is_combo?: boolean;
  tags?: string[];
  variants?: ItemVariant[];
  combo_items?: string[];
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedVariant?: ItemVariant;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface AppConfig {
  id: number;
  logo_url?: string;
  slide_urls: string[];
  whatsapp_number: string;
  yape_number: string;
  yape_name: string;
  plin_number?: string;
  plin_name?: string;
  facebook_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  address?: string;
  opening_hours?: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customer_name: string;
  order_type: 'delivery' | 'pickup';
  payment_method: 'yape' | 'plin' | 'efectivo';
  payment_status: 'pending' | 'paid';
  address?: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  items?: OrderItem[];
}
