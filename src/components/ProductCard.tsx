import React from 'react';
import { Star, Heart, ShoppingCart, AlertTriangle } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useInventory } from '../hooks/useInventory';
import { getStripeProductByName } from '../stripe-config';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const [loading, setLoading] = React.useState(false);
  const { getProductStock, isLowStock, isOutOfStock } = useInventory();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  
  const stockInfo = getProductStock(product.id);
  const lowStock = isLowStock(product.id);
  const outOfStock = isOutOfStock(product.id);

  const handleAddToCart = () => {
    if (!outOfStock) {
      addItem(product);
    }
  };

  const handleBuyNow = async () => {
    console.log('🚀 Buy Now clicked for product:', product.name);
    console.log('👤 User status:', { user: !!user, session: !!session });
    
    if (!user || !session) {
      console.log('❌ User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }

    console.log('✅ User authenticated, starting checkout process');
    
    const stripeProduct = getStripeProductByName(product.name);
    if (!stripeProduct) {
      console.error('❌ Stripe product configuration not found for:', product.name);
      console.log('📋 Available configured products:', stripeProducts.map(p => p.name));
      alert('Product configuration error. Please check console for details.');
      return;
    }
    
    console.log('✅ Found Stripe product configuration:', stripeProduct);

    setLoading(true);
    console.log('⏳ Calling Supabase Edge Function to create checkout session...');
    
    try {
      console.log('📡 Making request to stripe-checkout function with:', {
        price_id: stripeProduct.priceId,
        mode: stripeProduct.mode,
        success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: window.location.href,
      });
      
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: stripeProduct.priceId,
          mode: stripeProduct.mode,
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: window.location.href,
          delivery_instructions: '', // Can be extended to collect from user input
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        alert(`Checkout error: ${error.message || 'Unknown error'}`);
        console.error('❌ Checkout error:', error);
        return;
      }

      console.log('📦 Received response from checkout function:', data);
      
      if (data?.url) {
        console.log('✅ Redirecting to checkout:', data.url);
        window.location.href = data.url;
      } else {
        console.error('❌ No checkout URL received in response:', data);
        alert('No checkout URL received. Please check console for details.');
      }
    } catch (error) {
      console.error('❌ Unexpected checkout error:', error);
      alert(`Unexpected error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      console.log('🏁 Checkout process completed');
    }
  };

  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      <div className="relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <button className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white">
          <Heart className="w-4 h-4 text-gray-600 hover:text-black" />
        </button>
        {product.originalPrice && (
          <div className="absolute top-3 left-3 bg-black text-white px-2 py-1 rounded-full text-xs font-medium">
            Sale
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className="bg-white px-4 py-2 rounded-full text-sm font-medium text-gray-800">
              Out of Stock
            </span>
          </div>
        )}
        {lowStock && !outOfStock && (
          <div className="absolute top-3 left-3 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Low Stock</span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-black transition-colors">
          {product.name}
        </h3>
        
        <div className="flex items-center space-x-1 mb-2">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < Math.floor(product.rating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">({product.reviewCount})</span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {product.description}
        </p>
        
        {/* Stock Information */}
        <div className="mb-3">
          {outOfStock ? (
            <span className="text-sm text-red-600 font-medium">Out of Stock</span>
          ) : lowStock ? (
            <span className="text-sm text-orange-600 font-medium">
              Only {stockInfo.stock} left in stock
            </span>
          ) : (
            <span className="text-sm text-green-600 font-medium">
              {stockInfo.stock} in stock
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-gray-900">
              €{product.price.toFixed(2)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-gray-500 line-through">
                €{product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className={`flex items-center space-x-1 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                !outOfStock
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <ShoppingCart className="w-3 h-3" />
              <span>Cart</span>
            </button>
            <button
              onClick={handleBuyNow}
              disabled={outOfStock || loading}
              className={`flex items-center space-x-1 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                !outOfStock && !loading
                  ? 'bg-black text-white hover:bg-gray-800 hover:shadow-lg'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
              <span>
                {loading ? 'Processing...' : outOfStock ? 'Unavailable' : 'Buy Now'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}