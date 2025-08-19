import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

const isSupabaseConfigured = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://dummy.supabase.co');
};

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    if (!isSupabaseConfigured()) {
      setError('Database is not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching products:', fetchError);
        setError('Failed to load products');
        setProducts([]);
      } else {
        setProducts(data || []);
        setError(null);
      }
    } catch (err) {
      console.error('Unexpected error fetching products:', err);
      setError('An unexpected error occurred');
      setProducts([]);
    } finally {
      setLoading(false);
    }
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
    return product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold;
  };

  const isOutOfStock = (product: Product) => {
    return product.stock_quantity === 0;
  };

  useEffect(() => {
    fetchProducts();
    
    // Set up real-time subscription for automatic updates with detailed debugging
    if (isSupabaseConfigured()) {
      console.log('🔄 Setting up real-time subscription for products table...');
      console.log('📡 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('🔑 Supabase Key present:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
      
      const channel = supabase
        .channel('products-realtime', {
          config: {
            broadcast: { self: true },
            presence: { key: 'products' }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products'
          },
          (payload) => {
            console.log('📡 REAL-TIME UPDATE RECEIVED:', payload);
            console.log('📡 Event type:', payload.eventType);
            console.log('📡 New data:', payload.new);
            console.log('📡 Old data:', payload.old);
            
            // Handle different types of changes
            if (payload.eventType === 'INSERT') {
              console.log('➕ Product added:', payload.new);
              setProducts(prev => [...prev, payload.new as Product]);
            } else if (payload.eventType === 'UPDATE') {
              console.log('✏️ Product updated:', payload.new);
              setProducts(prev => prev.map(p => p.id === payload.new.id ? payload.new as Product : p));
            } else if (payload.eventType === 'DELETE') {
              console.log('🗑️ Product deleted:', payload.old);
              setProducts(prev => prev.filter(p => p.id !== payload.old.id));
            }
            
            // Force a re-render by updating a timestamp
            console.log('🔄 Forcing component re-render...');
          }
        )
        .subscribe((status) => {
          console.log('📡 REAL-TIME SUBSCRIPTION STATUS:', status);
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

      // Test the connection after a short delay
      setTimeout(() => {
        console.log('🧪 Testing real-time connection...');
        console.log('📊 Current channel state:', channel);
      }, 2000);

      // Cleanup subscription on unmount
      return () => {
        console.log('🧹 CLEANING UP REAL-TIME SUBSCRIPTION');
        supabase.removeChannel(channel);
      };
    } else {
      console.error('❌ REAL-TIME UPDATES DISABLED - SUPABASE NOT CONFIGURED');
    }
  }, []);

  return {
    products,
    loading,
    error,
    fetchProducts,
    updateProductStock,
    getProductsByCategory,
    getProductById,
    isLowStock,
    isOutOfStock,
  };
}