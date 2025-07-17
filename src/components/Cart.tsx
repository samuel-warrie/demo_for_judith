import React from 'react';
import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getStripeProductByName } from '../stripe-config';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Cart({ isOpen, onClose }: CartProps) {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
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

    setLoading(true);
    console.log('⏳ Processing cart checkout...');

    try {
      // Process all cart items
      console.log('🎯 Processing all cart items:', items.length);
      
      // Convert cart items to line items for Stripe
      const lineItems = [];
      
      for (const item of items) {
        const stripeProduct = getStripeProductByName(item.name);
        if (!stripeProduct) {
          console.error('❌ Stripe product configuration not found for:', item.name);
          alert(`Product configuration error for "${item.name}". Please check your Stripe configuration.`);
          return;
        }
        
        lineItems.push({
          price_id: stripeProduct.priceId,
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
          delivery_instructions: '', // Can be extended to collect from user input
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
            <h2 className="text-lg font-semibold text-gray-900">Shopping Cart</h2>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
                <p className="text-gray-500">Add some beautiful products to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 bg-gray-50 rounded-xl p-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                      <p className="text-sm text-gray-500">€{item.price.toFixed(2)} each</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-white rounded-full transition-colors"
                        >
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-white rounded-full transition-colors"
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
                        Remove
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
                <span>Total:</span>
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
                    'Proceed to Checkout'
                  )}
                </button>
                <button
                  onClick={clearCart}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Clear Cart
                </button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Free shipping on orders over €5
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}