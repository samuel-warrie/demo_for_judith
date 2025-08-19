import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

// Check if Supabase is properly configured
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
        console.error('Detailed error:', JSON.stringify(fetchError, null, 2));
        setError('Failed to load products');
        setProducts([]);
      } else {
        console.log('Successfully fetched products:', data);
        console.log('Number of products:', data?.length || 0);
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
    if (!isSupabaseConfigured()) {
      return false;
    }

    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);

      if (updateError) {
        console.error('Error updating stock:', updateError);
        return false;
      }

      // Update local state
      setProducts(prev => 
        prev.map(product => 
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
    return product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold;
  };

  const isOutOfStock = (product: Product) => {
    return product.stock_quantity === 0;
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.log('❌ Supabase not configured, skipping real-time setup');
      return;
    }

    console.log('🔄 Setting up real-time subscription...');
    console.log('📊 Current products count:', products.length);
    
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('🚀 Real-time product change detected:', payload);
          console.log('📦 Payload details:', {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          });
          
          switch (payload.eventType) {
            case 'INSERT':
              console.log('➕ Adding new product to state');
              setProducts(prev => {
                const newProducts = [...prev, payload.new as Product];
                console.log('📈 Products count after INSERT:', newProducts.length);
                return newProducts;
              });
              break;
              
            case 'UPDATE':
              console.log('✏️ Updating product in state, ID:', payload.new.id);
              setProducts(prev => 
                prev.map(product => 
                  product.id === payload.new.id 
                    ? { ...payload.new as Product }
                    : product
                )
              );
              console.log('✅ Product updated in state');
              break;
              
            case 'DELETE':
              console.log('🗑️ Removing product from state');
              setProducts(prev => {
                const newProducts = prev.filter(product => product.id !== payload.old.id);
                console.log('📉 Products count after DELETE:', newProducts.length);
                return newProducts;
              });
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log('📊 Real-time subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to products real-time updates!');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('❌ Real-time not enabled - enable products table in Supabase Dashboard → Database → Replication');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Real-time subscription timed out');
        } else if (status === 'CLOSED') {
          console.warn('🔒 Real-time subscription closed');
        }
      });

    return () => {
      console.log('🔌 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }
  )

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