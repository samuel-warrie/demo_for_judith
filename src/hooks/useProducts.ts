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
    
    // Set up real-time subscription for automatic updates
    if (isSupabaseConfigured()) {
      console.log('🔄 Setting up real-time subscription for products...');
      
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
            console.log('📡 Real-time update received:', payload);
            
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
          }
        )
        .subscribe((status) => {
          console.log('📡 Real-time subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time updates enabled for products');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('⚠️ Real-time channel error - falling back to periodic refresh');
            // Set up periodic refresh as fallback
            const interval = setInterval(fetchProducts, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
          } else if (status === 'TIMED_OUT') {
            console.warn('⚠️ Real-time connection timed out - falling back to periodic refresh');
            const interval = setInterval(fetchProducts, 30000);
            return () => clearInterval(interval);
          } else if (status === 'CLOSED') {
            console.warn('⚠️ Real-time connection closed - falling back to periodic refresh');
            const interval = setInterval(fetchProducts, 30000);
            return () => clearInterval(interval);
          }
        });

      // Cleanup subscription on unmount
      return () => {
        console.log('🧹 Cleaning up real-time subscription');
        supabase.removeChannel(channel);
      };
    } else {
      console.log('ℹ️ Real-time updates disabled - Supabase not configured');
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