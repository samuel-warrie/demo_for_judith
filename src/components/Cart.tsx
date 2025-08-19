import React from 'react';
import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getStripeProductByName } from '../stripe-config';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Cart({ isOpen, onClose }: CartProps) {
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
  const { getProductById } = useProducts();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    console.log('🛒 Cart checkout initiated');
    console.log('📦 Cart items:', items);

    if (items.length === 0) {
      console.log('❌ Cart is empty');
      return;
    }

    // Check for out-of-stock items before proceeding
    const { getProductById } = useProducts();
    const outOfStockItems = [];
    const availableItems = [];

    for (const item of items) {
      const currentProduct = getProductById(item.id);
      if (!currentProduct || currentProduct.stock_quantity === 0 || !currentProduct.in_stock) {
        outOfStockItems.push(item);
      } else if (currentProduct.stock_quantity < item.quantity) {
        // Reduce quantity to available stock
        updateQuantity(item.id, currentProduct.stock_quantity);
        availableItems.push({ ...item, quantity: currentProduct.stock_quantity });
      } else {
        availableItems.push(item);
      }
    }

    // Remove out-of-stock items from cart
    outOfStockItems.forEach(item => removeItem(item.id));

    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems.map(item => item.name).join(', ');
      alert(`The following items are no longer available and have been removed from your cart: ${itemNames}`);
    }

    if (availableItems.length === 0) {
      console.log('❌ No available items to checkout');
      return;
    }
    // Check if Supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      alert('Payment system is not configured. Please set up Supabase environment variables to enable payments.');
      return;
    }

    setLoading(true);
    console.log('⏳ Processing cart checkout...');

    try {
      // Process all cart items
      console.log('🎯 Processing all cart items:', items.length);
      
      // Convert cart items to line items for Stripe
      const lineItems = [];
      
      for (const item of items) {
        if (!item.stripe_price_id) {
          console.error('❌ No Stripe price ID for product:', item.name);
          alert(`Payment configuration error for "${item.name}". Please contact support.`);
          return;
        }
        
        lineItems.push({
          price_id: item.stripe_price_id,
          quantity: item.quantity
        });
      }
      
      console.log('✅ Created line items for checkout:', lineItems);
      console.log('📡 Creating checkout session...');
      
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          line_items: lineItems,
          mode: 'payment', // All products are one-time payments
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: window.location.href,
          metadata: {
            order_type: 'product_purchase',
            terms_accepted: 'true' // Products don't require explicit T&C acceptance
          }
        }
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        alert(`Checkout error: ${error.message || 'Unknown error'}`);
        return;
      }

      console.log('📦 Received response from checkout function:', data);
      
      if (data?.url) {
        console.log('✅ Redirecting to checkout:', data.url);
        // Clear cart on successful checkout initiation
        clearCart();
        onClose();
        window.location.href = data.url;
      } else {
        console.error('❌ No checkout URL received in response:', data);
        alert('No checkout URL received. Please try again.');
      }
    } catch (error) {
      console.error('❌ Unexpected checkout error:', error);
      alert(`Unexpected error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      console.log('🏁 Cart checkout process completed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('cart.title')}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('cart.empty')}</h3>
                <p className="text-gray-500">{t('cart.emptyDescription')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className={`flex items-center space-x-4 rounded-xl p-4 ${
                    (() => {
                      const currentProduct = getProductById(item.id);
                      const isOutOfStock = !currentProduct || currentProduct.stock_quantity === 0 || !currentProduct.in_stock;
                      return isOutOfStock ? 'bg-red-50 border border-red-200' : 'bg-gray-50';
                    })()
                  }`}>
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium truncate ${
                        (() => {
                          const currentProduct = getProductById(item.id);
                          const isOutOfStock = !currentProduct || currentProduct.stock_quantity === 0 || !currentProduct.in_stock;
                          return isOutOfStock ? 'text-red-700' : 'text-gray-900';
                        })()
                      }`}>
                        {item.name}
                        {(() => {
                          const currentProduct = getProductById(item.id);
                          const isOutOfStock = !currentProduct || currentProduct.stock_quantity === 0 || !currentProduct.in_stock;
                          return isOutOfStock ? ' (Out of Stock)' : '';
                        })()}
                      </h4>
                      <p className={`text-sm ${
                        (() => {
                          const currentProduct = getProductById(item.id);
                          const isOutOfStock = !currentProduct || currentProduct.stock_quantity === 0 || !currentProduct.in_stock;
                          return isOutOfStock ? 'text-red-500' : 'text-gray-500';
                        })()
                      }`}>
                        €{item.price.toFixed(2)} {t('cart.each')}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => {
                            const currentProduct = getProductById(item.id);
                            const isOutOfStock = !currentProduct || currentProduct.stock_quantity === 0 || !currentProduct.in_stock;
                            if (!isOutOfStock) {
                              updateQuantity(item.id, item.quantity - 1);
                            }
                          }}
                          disabled={(() => {
                            const currentProduct = getProductById(item.id);
                            return !currentProduct || currentProduct.stock_quantity === 0 || !currentProduct.in_stock;
                          })()}
                          className={`p-1 rounded-full transition-colors ${
                            (() => {
                              const currentProduct = getProductById(item.id);
                              const isOutOfStock = !currentProduct || currentProduct.stock_quantity === 0 || !currentProduct.in_stock;
                              return isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'hover:bg-white';
                            })()
                          }`}
                        >
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => {
                            const currentProduct = getProductById(item.id);
                            const isOutOfStock = !currentProduct || currentProduct.stock_quantity === 0 || !currentProduct.in_stock;
                            const hasEnoughStock = currentProduct && item.quantity < currentProduct.stock_quantity;
                            if (!isOutOfStock && hasEnoughStock) {
                              updateQuantity(item.id, item.quantity + 1);
                            }
                          }}
                          disabled={(() => {
                            const currentProduct = getProductById(item.id);
                            const isOutOfStock = !currentProduct || currentProduct.stock_quantity === 0 || !currentProduct.in_stock;
                            const hasEnoughStock = currentProduct && item.quantity < currentProduct.stock_quantity;
                            return isOutOfStock || !hasEnoughStock;
                          })()}
                          className={`p-1 rounded-full transition-colors ${
                            (() => {
                              const currentProduct = getProductById(item.id);
                              const isOutOfStock = !currentProduct || currentProduct.stock_quantity === 0 || !currentProduct.in_stock;
                              const hasEnoughStock = currentProduct && item.quantity < currentProduct.stock_quantity;
                              return (isOutOfStock || !hasEnoughStock) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'hover:bg-white';
                            })()
                          }`}
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        €{(item.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-sm text-red-500 hover:text-red-700 transition-colors mt-1"
                      >
                        {t('cart.remove')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between text-lg font-semibold text-gray-900">
                <span>{t('cart.total')}</span>
                <span>€{totalPrice.toFixed(2)}</span>
              </div>
              
              <div className="space-y-2">
                <button 
                  onClick={handleCheckout}
                  disabled={loading || items.length === 0}
                  className={`w-full py-3 rounded-xl font-medium transition-colors ${
                    loading || items.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    t('cart.proceedToCheckout')
                  )}
                </button>
                <button
                  onClick={clearCart}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  {t('cart.clearCart')}
                </button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                {t('cart.freeShipping')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}