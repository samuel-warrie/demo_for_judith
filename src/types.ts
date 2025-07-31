export interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  image_url: string;
  category: string;
  subcategory?: string;
  brand?: string;
  description?: string;
  descriptions?: {
    en: string;
    fi: string;
    sv: string;
  };
  in_stock: boolean;
  stock_quantity?: number;
  low_stock_threshold?: number;
  rating?: number;
  review_count?: number;
  stripe_product_id?: string;
  stripe_price_id?: string;
  second_image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  updateProductStock: (productId: string, newStock: number) => void;
}