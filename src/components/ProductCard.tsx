import React from 'react';
import { Star, Heart, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { getStripeProductByName } from '../stripe-config';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { stripeProducts } from '../stripe-config';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { t, i18n } = useTranslation();
  const { addItem } = useCart();
  const [loading, setLoading] = React.useState(false);
  const { user, session } = useAuth();
  const navigate = useNavigate();
  
  const lowStock = false; // Simplified since we're using in_stock boolean
  const outOfStock = !product.in_stock;
  
  // Get description in current language with fallback to English
  const getDescription = () => {
    // First try the descriptions JSONB field
    if (product.descriptions) {
      const baseLang = i18n.language.split('-')[0] as keyof typeof product.descriptions;
      const currentLang = baseLang;
      return product.descriptions[currentLang] || product.descriptions.en || '';
    }
    
    // Fallback to the simple description text field
    return product.description || '';
  };

  const handleAddToCart = () => {
    if (!outOfStock) {
      addItem(product);
    }
  };

  const handleBuyNow = async () => {
    console.log('🚀 Buy Now clicked for product:', product.name);
    console.log('🛒 Starting checkout process');
    
    // Check if Supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      alert('Payment system is not configured. Please set up Supabase environment variables to enable payments.');
      return;
    }
    
    if (!product.stripe_price_id) {
      console.error('❌ No Stripe price ID configured for product:', product.name);
      alert('Product payment configuration error. Please contact support.');
      return;
    }
    
    console.log('✅ Using Stripe price ID:', product.stripe_price_id);

    setLoading(true);
    console.log('⏳ Calling Supabase Edge Function to create checkout session...');
    
    try {
      console.log('📡 Making request to stripe-checkout function with:', {
        price_id: product.stripe_price_id,
        mode: 'payment',
        success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: window.location.href,
      });
      
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: product.stripe_price_id,
          mode: 'payment',
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: window.location.href,
          metadata: {
            order_type: 'product_purchase',
            product_name: product.name,
            terms_accepted: 'true' // Products don't require explicit T&C acceptance
          }
        }
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
        <Link to={`/product/${product.id}`}>
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
          />
        </Link>
        <button className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white">
          <Heart className="w-4 h-4 text-gray-600 hover:text-black" />
        </button>
        {product.originalPrice && (
          <div className="absolute top-3 left-3 bg-black text-white px-2 py-1 rounded-full text-xs font-medium">
            {t('products.sale')}
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className="bg-white px-4 py-2 rounded-full text-sm font-medium text-gray-800">
              {t('products.outOfStock')}
            </span>
          </div>
        )}
        {lowStock && !outOfStock && (
          <div className="absolute top-3 left-3 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>{t('products.lowStock', { count: product.stock_quantity })}</span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-black transition-colors cursor-pointer">
            {product.name}
          </h3>
        </Link>
        
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
          <span className="text-xs text-gray-500">({product.review_count})</span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {getDescription()}
        </p>
        
        {/* Stock Information */}
        <div className="mb-3">
          {outOfStock ? (
            <span className="text-sm text-red-600 font-medium">{t('products.outOfStock')}</span>
          ) : lowStock ? (
            <span className="text-sm text-orange-600 font-medium">
              {t('products.lowStock', { count: product.stock_quantity })}
            </span>
          ) : (
            <span className="text-sm text-green-600 font-medium">
              {t('products.inStock', { count: product.stock_quantity })}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-gray-900">
              €{product.price.toFixed(2)}
            </span>
            {product.original_price && (
              <span className="text-sm text-gray-500 line-through">
                €{product.original_price.toFixed(2)}
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
              <span>{t('products.addToCart')}</span>
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
                {loading ? t('products.processing') : outOfStock ? t('products.unavailable') : t('products.buyNow')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}