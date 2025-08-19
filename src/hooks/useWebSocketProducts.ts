import { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { supabase } from '../lib/supabase';

const isSupabaseConfigured = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://dummy.supabase.co' && supabaseUrl.startsWith('https://'));
};

export function useWebSocketProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<any>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchProducts = async () => {
    if (!isSupabaseConfigured()) {
      setError('Database is not configured. Please connect to Supabase.');
      setLoading(false);
      return;
    }

    try {
      console.log('📡 Fetching products from database...');
      
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Error fetching products:', fetchError);
        setError(`Failed to load products: ${fetchError.message}`);
        setProducts([]);
      } else {
        console.log(`✅ Fetched ${data?.length || 0} products successfully`);
        setProducts(data || []);
        setError(null);
        lastFetchRef.current = Date.now();
      }
    } catch (err) {
      console.error('❌ Unexpected error fetching products:', err);
      setError('An unexpected error occurred while loading products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!isSupabaseConfigured()) {
      console.log('⚠️ Supabase not configured, skipping real-time setup');
      return;
    }

    console.log('🔌 Setting up real-time subscription for products...');

    // Clean up existing subscription
    if (channelRef.current) {
      console.log('🧹 Unsubscribing from existing channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create new channel
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
          console.log('🎉 Real-time update received:', payload.eventType, payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              console.log('➕ Adding new product:', payload.new);
              setProducts(prev => {
                // Check if product already exists to avoid duplicates
                const exists = prev.some(p => p.id === payload.new.id);
                if (exists) return prev;
                return [payload.new as Product, ...prev];
              });
              break;
              
            case 'UPDATE':
              console.log('✏️ Updating product:', payload.new);
              setProducts(prev => 
                prev.map(p => p.id === payload.new.id ? payload.new as Product : p)
              );
              break;
              
            case 'DELETE':
              console.log('🗑️ Removing product:', payload.old);
              setProducts(prev => prev.filter(p => p.id !== payload.old.id));
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
        
        switch (status) {
          case 'SUBSCRIBED':
            console.log('✅ Real-time connected successfully!');
            setConnected(true);
            break;
            
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
          case 'CLOSED':
            console.log('❌ Real-time connection failed:', status);
            setConnected(false);
            break;
            
          default:
            console.log('📡 Real-time status:', status);
        }
      });

    channelRef.current = channel;
  };

  const refreshProducts = async () => {
    console.log('🔄 Manual refresh triggered');
    await fetchProducts();
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
    console.log('🚀 Initializing WebSocket products hook');
    
    // Initial fetch
    fetchProducts();
    
    // Setup real-time subscription after initial fetch
    const timer = setTimeout(() => {
      setupRealtimeSubscription();
    }, 1000);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up WebSocket products hook');
      clearTimeout(timer);
      
      if (channelRef.current) {
        console.log('🔌 Unsubscribing from real-time channel');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return {
    products,
    loading,
    error,
    connected,
    refreshProducts,
    getProductsByCategory,
    getProductById,
    isLowStock,
    isOutOfStock,
  };
}