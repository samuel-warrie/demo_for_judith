export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image_url: string;
  category: string;
  rating: number;
  review_count: number;
  descriptions: {
    en: string;
    fi: string;
    sv: string;
  };
  stock_quantity: number;
  low_stock_threshold: number;
  stripe_product_id?: string;
  stripe_price_id?: string;
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