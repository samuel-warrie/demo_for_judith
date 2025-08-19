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

  const fetchProducts = async () => {
    if (!isSupabaseConfigured()) {
      setError('Database is not configured. Please connect to Supabase.');
      setLoading(false);
      return;
    }

    try {
      console.log('📡 Fetching products from database...', new Date().toLocaleTimeString());
      
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching products:', fetchError);
        setError(`Failed to load products: ${fetchError.message}`);
        setProducts([]);
      } else {
        console.log(`✅ Fetched ${data?.length || 0} products from database at`, new Date().toLocaleTimeString());
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

  const setupRealtimeSubscription = async () => {
    if (!isSupabaseConfigured()) {
      console.log('⚠️ Supabase not configured, skipping real-time setup');
      return;
    }

    console.log('🔌 Setting up real-time subscription for products...');

    // Clean up existing subscription
    if (channelRef.current) {
      console.log('🧹 Removing existing channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setConnected(false);
    }

    // Create new channel with unique name
    const channelName = `products-realtime-${Date.now()}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: '' }
      }
    })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: null
        },
        (payload) => {
          console.log('🎉 Real-time update received:', payload.eventType, payload.new?.name || payload.old?.name);
          
          switch (payload.eventType) {
            case 'INSERT':
              console.log('➕ Adding new product:', payload.new?.name);
              setProducts(prev => {
                const exists = prev.some(p => p.id === payload.new?.id);
                if (exists) return prev;
                return [payload.new as Product, ...prev];
              });
              break;
              
            case 'UPDATE':
              console.log('✏️ Updating product:', payload.new?.name);
              setProducts(prev => 
                prev.map(p => p.id === payload.new?.id ? payload.new as Product : p)
              );
              break;
              
            case 'DELETE':
              console.log('🗑️ Removing product:', payload.old?.name);
              setProducts(prev => prev.filter(p => p.id !== payload.old?.id));
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
            console.log('❌ Real-time connection issue:', status);
            setConnected(false);
            // Retry connection after 5 seconds
            setTimeout(() => {
              console.log('🔄 Retrying real-time connection...');
              setupRealtimeSubscription();
            }, 5000);
            break;
            
          default:
            console.log('📡 Real-time status:', status);
        }
      });

    channelRef.current = channel;
  };

  const refreshProducts = () => {
    console.log('🔄 Manual refresh triggered');
    fetchProducts();
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
    
    // Setup real-time subscription after initial fetch completes
    const setupTimer = setTimeout(() => {
      setupRealtimeSubscription();
    }, 2000);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up WebSocket products hook');
      clearTimeout(setupTimer);
      
      if (channelRef.current) {
        console.log('🔌 Unsubscribing from real-time channel');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setConnected(false);
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