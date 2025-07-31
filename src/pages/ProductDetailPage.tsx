import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, Heart, ShoppingCart, ArrowLeft, AlertTriangle, Package, Shield } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useProducts } from '../hooks/useProducts';
import { Product } from '../types';
import { supabase } from '../lib/supabase';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { getProductById } = useProducts();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyLoading, setBuyLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        
        // Check if Supabase is configured
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://dummy.supabase.co') {
          console.error('Supabase not configured');
          navigate('/');
          return;
        }

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          console.error('Product not found:', error);
          navigate('/');
          return;
        }

        // Debug logging to check what data we're getting
        console.log('Fetched product data:', data);
        console.log('Image URL:', data.image_url);
        console.log('Stock quantity:', data.stock_quantity);
        console.log('Descriptions:', data.descriptions);

        setProduct(data);
      } catch (err) {
        console.error('Error fetching product:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h2>
          <Link to="/" className="text-black hover:underline">Return to shop</Link>
        </div>
      </div>
    );
  }

  // Safe stock calculations with proper fallbacks
  const stockQuantity = product.stock_quantity ?? 0;
  const lowStockThreshold = product.low_stock_threshold ?? 5;
  const lowStock = stockQuantity > 0 && stockQuantity <= lowStockThreshold;
  const outOfStock = stockQuantity === 0;

  // Get description in current language with fallback to English
  const getDescription = () => {
    if (!product.descriptions) {
      return 'No description available';
    }
    
    // Handle both object and string descriptions
    if (typeof product.descriptions === 'string') {
      return product.descriptions;
    }
    
    if (typeof product.descriptions === 'object') {
      const currentLang = i18n.language.split('-')[0];
      const descriptions = product.descriptions as Record<string, string>;
      
      // Try current language first, then English, then any available language
      return descriptions[currentLang] || 
             descriptions.en || 
             descriptions.english ||
             Object.values(descriptions)[0] || 
             'No description available';
    }
    
    return 'No description available';
  };

  const handleAddToCart = () => {
    if (!outOfStock && quantity > 0) {
      for (let i = 0; i < quantity; i++) {
        addItem(product);
      }
    }
  };

  const handleBuyNow = async () => {
    if (!product.stripe_price_id) {
      alert('Payment configuration error. Please contact support.');
      return;
    }

    setBuyLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          line_items: [{
            price_id: product.stripe_price_id,
            quantity: quantity
          }],
          mode: 'payment',
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: window.location.href,
          metadata: {
            order_type: 'product_purchase',
            product_name: product.name,
            terms_accepted: 'true'
          }
        }
      });

      if (error) {
        console.error('Checkout error:', error);
        alert(`Checkout error: ${error.message || 'Unknown error'}`);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert('No checkout URL received. Please try again.');
      }
    } catch (error) {
      console.error('Unexpected checkout error:', error);
      alert(`Unexpected error: ${error.message || 'Unknown error'}`);
    } finally {
      setBuyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="relative">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-96 lg:h-full object-cover rounded-2xl"
                onError={(e) => {
                  console.error('Image failed to load:', product.image_url);
                  e.currentTarget.src = '/placeholder-image.jpg'; // Fallback image
                }}
              />
            ) : (
              <div className="w-full h-96 lg:h-full bg-gray-200 rounded-2xl flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Package className="w-16 h-16 mx-auto mb-2" />
                  <p>No image available</p>
                </div>
              </div>
            )}
            
            {product.original_price && product.original_price > product.price && (
              <div className="absolute top-4 left-4 bg-black text-white px-3 py-1 rounded-full text-sm font-medium">
                {t('products.sale')}
              </div>
            )}
            {outOfStock && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-2xl">
                <span className="bg-white px-6 py-3 rounded-full text-lg font-medium text-gray-800">
                  {t('products.outOfStock')}
                </span>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              
              {/* Rating */}
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating || 0)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600">({product.review_count || 0} reviews)</span>
              </div>

              {/* Price */}
              <div className="flex items-center space-x-3 mb-6">
                <span className="text-3xl font-bold text-gray-900">
                  €{(product.price || 0).toFixed(2)}
                </span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-xl text-gray-500 line-through">
                    €{product.original_price.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Stock Status */}
              <div className="mb-6">
                {outOfStock ? (
                  <div className="flex items-center space-x-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">{t('products.outOfStock')}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Package className="w-5 h-5" />
                    <span className="font-medium">
                      In Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Debug Info (remove in production) */}
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                <h4 className="font-semibold text-yellow-800 mb-2">Debug Info:</h4>
                <p><strong>Image URL:</strong> {product.image_url || 'Not set'}</p>
                <p><strong>Stock:</strong> {stockQuantity}</p>
                <p><strong>Low Stock Threshold:</strong> {lowStockThreshold}</p>
                <p><strong>Descriptions:</strong> {JSON.stringify(product.descriptions)}</p>
                <p><strong>Current Language:</strong> {i18n.language}</p>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">{getDescription()}</p>
              </div>

              {/* Quantity Selector */}
              {!outOfStock && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="w-4 h-4 flex items-center justify-center">−</span>
                    </button>
                    <span className="text-lg font-medium w-12 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(stockQuantity, quantity + 1))}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="w-4 h-4 flex items-center justify-center">+</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleBuyNow}
                  disabled={outOfStock || buyLoading}
                  className={`w-full py-4 rounded-xl font-semibold transition-all duration-200 ${
                    !outOfStock && !buyLoading
                      ? 'bg-black text-white hover:bg-gray-800 hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {buyLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
                      <span>{t('products.processing')}</span>
                    </div>
                  ) : outOfStock ? (
                    t('products.unavailable')
                  ) : (
                    `${t('products.buyNow')} - €${((product.price || 0) * quantity).toFixed(2)}`
                  )}
                </button>

                <button
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  className={`w-full py-4 rounded-xl font-semibold transition-all duration-200 ${
                    !outOfStock
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <ShoppingCart className="w-5 h-5" />
                    <span>{t('products.addToCart')}</span>
                  </div>
                </button>
              </div>

              {/* Security Badge */}
              <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500">
                <Shield className="w-4 h-4" />
                <span>Secure payment powered by Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}