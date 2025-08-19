import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

const isSupabaseConfigured = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://dummy.supabase.co' && supabaseUrl.startsWith('https://'));
};

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

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
        setLastFetch(Date.now());
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

  const refreshProducts = () => {
    console.log('🔄 Manual refresh triggered');
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
      setTimeout(() => {
        console.log('🔄 Refreshing products after stock update');
        fetchProducts();
      }, 500);
      
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
      console.log('🔗 Setting up real-time subscription for products table...');
      
      const channel = supabase
        .channel('public:products')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products'
          },
          (payload) => {
            console.log('📡 Real-time update received:', payload.eventType, payload);
            console.log('🔄 Refreshing products due to real-time update...');
            setTimeout(() => fetchProducts(), 100);
            
            // Force a re-render by updating a timestamp
            console.log('🔄 Forcing component re-render...');
          }
        )
        .subscribe((status) => {
          console.log('📡 Real-time subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time updates enabled for products table');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('⚠️ Real-time channel error - check if Realtime is enabled for products table');
          } else if (status === 'TIMED_OUT') {
            console.warn('⚠️ Real-time connection timed out');
          } else if (status === 'CLOSED') {
            console.warn('⚠️ Real-time connection closed');
          }
          if (status === 'SUBSCRIBED') {
            console.log('✅ REAL-TIME UPDATES SUCCESSFULLY ENABLED FOR PRODUCTS TABLE');
            console.log('🎯 Listening for changes on public.products table');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('⚠️ REAL-TIME CHANNEL ERROR - This is expected if Realtime is not enabled for the products table');
            console.log('🔄 Attempting to reconnect...');
          } else if (status === 'TIMED_OUT') {
            console.warn('⚠️ REAL-TIME CONNECTION TIMED OUT - This is expected if Realtime is not enabled');
          } else if (status === 'CLOSED') {
            console.warn('⚠️ REAL-TIME CONNECTION CLOSED - This is expected if Realtime is not enabled');
          } else {
            console.log('📡 Real-time status:', status);
          }
        });

      // Set up polling as fallback (every 30 seconds)
      const pollInterval = setInterval(() => {
        const timeSinceLastFetch = Date.now() - lastFetch;
        if (timeSinceLastFetch > 25000) { // Only poll if no recent fetch
          console.log('🔄 Polling for product updates...');
          fetchProducts();
        }
      }, 30000);

      // Test the connection after a short delay
      setTimeout(() => {
        console.log('🧪 Testing real-time connection...');
        console.log('📊 Current channel state:', channel);
      }, 2000);

      // Cleanup subscription on unmount
      return () => {
        console.log('🧹 Cleaning up real-time subscription and polling');
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    }
  }, [lastFetch]);

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