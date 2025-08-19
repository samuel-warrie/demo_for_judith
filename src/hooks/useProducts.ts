import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

const isSupabaseConfigured = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://dummy.supabase.co' && supabaseUrl.startsWith('https://'));
};

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  const fetchProducts = async () => {
    if (!isSupabaseConfigured()) {
      setError('Database is not configured. Please connect to Supabase.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Fetching products from database...');
      
      // Test connection first
      const { data: testData, error: testError } = await supabase
        .from('products')
        .select('count')
        .limit(1)
        .single();
      
      if (testError && testError.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection and Supabase project status.');
      }
      
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching products:', fetchError);
        setError(`Failed to load products: ${fetchError.message}`);
        setProducts([]);
      } else {
        console.log(`✅ Fetched ${data?.length || 0} products from database`);
        setProducts(data || []);
        setError(null);
      }
    } catch (err) {
      console.error('Unexpected error fetching products:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
        setError('Network connection failed. Please check your internet connection and ensure your Supabase project is accessible.');
      } else if (errorMessage.includes('CORS')) {
        setError('CORS error: Please add your development server URL to Supabase project settings.');
      } else {
        setError(`Error: ${errorMessage}`);
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const updateSingleProduct = (updatedProduct: Product) => {
    setProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === updatedProduct.id ? updatedProduct : product
      )
    );
  };

  const addNewProduct = (newProduct: Product) => {
    setProducts(prevProducts => {
      const exists = prevProducts.some(p => p.id === newProduct.id);
      if (exists) {
        return prevProducts.map(p => p.id === newProduct.id ? newProduct : p);
      }
      return [newProduct, ...prevProducts];
    });
  };

  const removeProduct = (productId: string) => {
    setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
  };

  const refreshProducts = () => {
    fetchProducts();
  };

  const updateProductStock = async (productId: string, newStock: number) => {
    if (!isSupabaseConfigured()) return false;

    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);

      if (updateError) {
        console.error('Error updating stock:', updateError);
        return false;
      }
      
      // Immediately refresh products after stock update
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, stock_quantity: newStock }
            : product
        )
      );
      
      return true;
    } catch (err) {
      console.error('Unexpected error updating stock:', err);
      return false;
    }
  };

  const getProductsByCategory = (category: string) => {
    if (category === 'all') return products;
    return products.filter(product => product.category === category);
  };

  const getProductById = (id: string) => {
    return products.find(product => product.id === id);
  };

  const isLowStock = (product: Product) => {
    return product.stock_quantity > 0 && product.stock_quantity <= (product.low_stock_threshold || 5);
  };

  const isOutOfStock = (product: Product) => {
    return (product.stock_quantity || 0) === 0 || !product.in_stock;
  };

  useEffect(() => {
    fetchProducts();
    
    if (isSupabaseConfigured()) {
      console.log('🔧 Setting up enhanced real-time subscription for products table...');
      
      // Create a unique channel name to avoid conflicts
      const channelName = `products-realtime-${Date.now()}`;
      console.log('📡 Creating channel:', channelName);
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
          },
          (payload) => {
            console.log('🎉 REAL-TIME EVENT RECEIVED!');
            console.log('📡 Event type:', payload.eventType);
            console.log('📡 Table:', payload.table);
            console.log('📡 Schema:', payload.schema);
            console.log('📡 New data:', payload.new);
            console.log('📡 Old data:', payload.old);
            
            switch (payload.eventType) {
              case 'INSERT':
                if (payload.new) {
                  console.log('➕ Adding new product to state:', payload.new);
                  addNewProduct(payload.new as Product);
                }
                break;
              case 'UPDATE':
                if (payload.new) {
                  console.log('🔄 Updating product in state:', payload.new);
                  updateSingleProduct(payload.new as Product);
                }
                break;
              case 'DELETE':
                if (payload.old) {
                  console.log('🗑️ Removing product from state:', payload.old);
                  removeProduct((payload.old as Product).id);
                }
                break;
              default:
                console.log('❓ Unhandled event type:', payload.eventType);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 REAL-TIME STATUS:', status);
          
          switch (status) {
            case 'SUBSCRIBED':
              console.log('✅ REAL-TIME CONNECTED! Listening for database changes...');
              console.log('✅ Try changing a product in Supabase dashboard now');
              break;
            case 'CHANNEL_ERROR':
              console.warn('⚠️ Real-time channel error - falling back to polling');
              console.warn('⚠️ Check: Database → Publications → supabase_realtime');
              break;
            case 'CLOSED':
              console.warn('⚠️ Real-time connection closed');
              break;
            case 'TIMED_OUT':
              console.warn('⚠️ Real-time connection timed out');
              break;
            default:
              console.log('📡 Real-time status:', status);
          }
        });

      setRealtimeChannel(channel);
      
      // Enhanced connection testing
      setTimeout(() => {
        console.log('🧪 REAL-TIME TEST:');
        console.log('🧪 1. Go to your Supabase dashboard');
        console.log('🧪 2. Edit any product (change name, price, stock)');
        console.log('🧪 3. You should see "🎉 REAL-TIME EVENT RECEIVED!" above');
        console.log('🧪 4. The change should appear instantly in your app');
      }, 3000);

      // Fallback polling every 2 minutes (reduced from 5 minutes for better UX)
      const pollInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          console.log('🔄 Fallback refresh (2min interval)');
          fetchProducts();
        }
      }, 120000); // 2 minutes

      // Cleanup subscription on unmount
      return () => {
        console.log('🧹 Cleaning up real-time subscription and polling');
        if (channel) {
          supabase.removeChannel(channel);
        }
        clearInterval(pollInterval);
      };
    }
  }, []);

  return {
    products,
    loading,
    error,
    refreshProducts,
    updateProductStock,
    getProductsByCategory,
    getProductById,
    isLowStock,
    isOutOfStock,
  };
}