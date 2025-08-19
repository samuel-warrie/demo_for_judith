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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
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

    try {
      console.log('🔌 Setting up Supabase real-time subscription...');
      
      // Clean up existing subscription
      if (channelRef.current) {
        console.log('🧹 Cleaning up existing channel');
        channelRef.current.unsubscribe();
      }

      // Create new channel with unique name
      const channelName = `products-realtime-${Date.now()}`;
      console.log('📡 Creating channel:', channelName);
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products'
          },
          (payload) => {
            console.log('🎉 REAL-TIME EVENT RECEIVED!', payload);
            
            switch (payload.eventType) {
              case 'INSERT':
                console.log('➕ Product added:', payload.new);
                setProducts(prev => [payload.new as Product, ...prev]);
                break;
              case 'UPDATE':
                console.log('✏️ Product updated:', payload.new);
                setProducts(prev => prev.map(p => p.id === payload.new.id ? payload.new as Product : p));
                break;
              case 'DELETE':
                console.log('🗑️ Product deleted:', payload.old);
                setProducts(prev => prev.filter(p => p.id !== payload.old.id));
                break;
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 REAL-TIME STATUS:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ REAL-TIME CONNECTED!');
            setConnected(true);
            setError(null);
            
            // Stop polling since real-time is working
            if (pollingIntervalRef.current) {
              console.log('🛑 Stopping polling - real-time is active');
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.log('⚠️ Real-time channel error - using smart polling fallback');
            setConnected(false);
            startSmartPolling();
          } else if (status === 'TIMED_OUT') {
            console.log('⏰ Real-time connection timed out - using smart polling fallback');
            setConnected(false);
            startSmartPolling();
          } else if (status === 'CLOSED') {
            console.log('🔌 Real-time connection closed - using smart polling fallback');
            setConnected(false);
            startSmartPolling();
          } else {
            console.log('📡 Real-time status:', status);
          }
        });

      channelRef.current = channel;
    } catch (err) {
      console.error('❌ Failed to setup real-time subscription:', err);
      setConnected(false);
      startSmartPolling();
    }
  };

  const startSmartPolling = () => {
    // Only start polling if not already polling
    if (pollingIntervalRef.current) return;
    
    console.log('🔄 Starting smart polling fallback (30 seconds interval)');
    pollingIntervalRef.current = setInterval(() => {
      // Only fetch if it's been more than 25 seconds since last fetch
      const timeSinceLastFetch = Date.now() - lastFetchRef.current;
      if (timeSinceLastFetch > 25000) {
        console.log('🔄 Smart polling: fetching updates...');
        fetchProducts();
      }
    }, 30000); // Check every 30 seconds
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
    // Initial fetch
    fetchProducts();
    
    // Setup real-time subscription
    setupRealtimeSubscription();

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible, refresh if it's been more than 30 seconds
        const timeSinceLastFetch = Date.now() - lastFetchRef.current;
        if (timeSinceLastFetch > 30000) {
          console.log('👁️ Tab visible: refreshing products');
          fetchProducts();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Cleanup
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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