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

    // Set up real-time subscription for product changes
    if (!isSupabaseConfigured()) {
      return;
    }

    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('Real-time product change:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              setProducts(prev => [...prev, payload.new as Product]);
              break;
            case 'UPDATE':
              setProducts(prev => 
                prev.map(product => 
                  product.id === payload.new.id 
                    ? { ...product, ...payload.new } as Product
                    : product
                )
              );
              break;
            case 'DELETE':
              setProducts(prev => 
                prev.filter(product => product.id !== payload.old.id)
              );
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Set up real-time subscription in a separate useEffect
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.log('❌ Supabase not configured - skipping real-time setup');
      return;
    }

    console.log('🔄 Setting up real-time subscription for products table...');
    console.log('📡 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('🔑 Using anon key (first 20 chars):', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20));
    
    // Create a unique channel name to avoid conflicts
    const channelName = `products-changes-${Date.now()}`;
    console.log('📺 Creating channel:', channelName);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: undefined
        },
        (payload) => {
          console.log('🚀 Real-time product change detected:', payload);
          console.log('📦 Event type:', payload.eventType);
          console.log('📄 New data:', payload.new);
          console.log('📄 Old data:', payload.old);
          
          switch (payload.eventType) {
            case 'INSERT':
              console.log('➕ New product added:', payload.new);
              setProducts(prev => [...prev, payload.new as Product]);
              break;
              
            case 'UPDATE':
              console.log('✏️ Product updated:', payload.new);
              console.log('🔄 Updating product in state...');
              setProducts(prev => 
                prev.map(product => 
                  product.id === payload.new.id 
                    ? payload.new as Product
                    : product
                )
              );
              break;
              
            console.log('✅ Successfully subscribed to products real-time updates!');
              console.log('🗑️ Product deleted:', payload.old);
            console.warn('❌ Real-time subscription error - Realtime not enabled for products table');
            console.warn('💡 To enable: Go to Database → Replication in Supabase dashboard and enable products table');
            console.warn(`🔗 Dashboard URL: https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}`);
              break;
            console.warn('⏰ Real-time subscription timed out');
            default:
            console.warn('🔒 Real-time subscription closed unexpectedly');
          }
        }
      )
      .subscribe((status) => {
        console.log('📊 Real-time subscription status changed to:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to products real-time updates!');
          console.log('🎯 Listening for changes to products table...');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('❌ Real-time subscription error - Realtime not enabled for products table');
          console.warn('💡 To enable: Go to Database → Replication in Supabase dashboard and enable products table');
          console.warn('🔗 Dashboard URL: https://supabase.com/dashboard/project/' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]);
        } else if (status === 'TIMED_OUT') {
          console.warn('⏰ Real-time subscription timed out - check your internet connection');
        } else if (status === 'CLOSED') {
          console.warn('🔒 Real-time subscription closed unexpectedly');
        } else {
          console.log('📡 Subscription status:', status);
        }
      });

    // Test the connection after a short delay
    setTimeout(() => {
      console.log('📺 Channel state:', channel.state);
      console.log('🔌 Socket state:', supabase.realtime.channels.length, 'channels active');
    }, 2000);

    return () => {
      console.log('🔌 Unsubscribing from products real-time channel');
      supabase.removeChannel(channel);
    };
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