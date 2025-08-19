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

    console.log('🔌 Setting up real-time subscription for products...', new Date().toLocaleTimeString());

    // Clean up existing subscription
    if (channelRef.current) {
      console.log('🧹 Removing existing channel:', channelRef.current.topic);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setConnected(false);
    }

    // Create new channel for products table changes
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
          console.log('🎉 REAL-TIME EVENT RECEIVED:', {
            eventType: payload.eventType,
            productName: payload.new?.name || payload.old?.name,
            productId: payload.new?.id || payload.old?.id,
            timestamp: new Date().toLocaleTimeString(),
            fullPayload: payload
          });
          
          switch (payload.eventType) {
            case 'INSERT':
              if (payload.new) {
                console.log('➕ INSERTING NEW PRODUCT:', payload.new.name);
                setProducts(prev => {
                  const exists = prev.some(p => p.id === payload.new.id);
                  if (exists) {
                    console.log('⚠️ Product already exists in state, skipping insert');
                    return prev;
                  }
                  const newProducts = [payload.new, ...prev];
                  console.log('✅ PRODUCT ADDED TO STATE, new count:', newProducts.length);
                  return newProducts;
                });
              }
              break;
              
            case 'UPDATE':
              if (payload.new) {
                console.log('✏️ UPDATING PRODUCT:', payload.new.name);
                setProducts(prev => {
                  const updated = prev.map(p => p.id === payload.new.id ? payload.new : p);
                  console.log('✅ PRODUCT UPDATED IN STATE');
                  return updated;
                });
              }
              break;
              
            case 'DELETE':
              if (payload.old) {
                console.log('🗑️ DELETING PRODUCT:', payload.old.name);
                setProducts(prev => {
                  const filtered = prev.filter(p => p.id !== payload.old.id);
                  console.log('✅ PRODUCT REMOVED FROM STATE, new count:', filtered.length);
                  return filtered;
                });
              }
              break;
              
            default:
              console.log('❓ UNKNOWN EVENT TYPE:', payload.eventType);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 SUBSCRIPTION STATUS CHANGE:', status, 'at', new Date().toLocaleTimeString());
        
        switch (status) {
          case 'SUBSCRIBED':
            console.log('✅ REAL-TIME CONNECTED SUCCESSFULLY!');
            setConnected(true);
            break;
            
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
          case 'CLOSED':
            console.log('❌ REAL-TIME CONNECTION ISSUE:', status);
            setConnected(false);
            // Retry connection after 5 seconds
            setTimeout(() => {
              console.log('🔄 RETRYING REAL-TIME CONNECTION after', status);
              setupRealtimeSubscription();
            }, 5000);
            break;
            
          default:
            console.log('📡 REAL-TIME STATUS:', status);
        }
      });

    channelRef.current = channel;
    console.log('📡 CHANNEL CREATED AND STORED');
  };

  const refreshProducts = () => {
    console.log('🔄 MANUAL REFRESH TRIGGERED at', new Date().toLocaleTimeString());
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
    console.log('🚀 INITIALIZING WEBSOCKET PRODUCTS HOOK');
    
    // Initial fetch
    fetchProducts();
    
    // Setup real-time subscription immediately after initial fetch
    const setupTimer = setTimeout(async () => {
      console.log('⏰ SETTING UP REAL-TIME SUBSCRIPTION...');
      setupRealtimeSubscription();
    }, 1000);

    // Cleanup function
    return () => {
      console.log('🧹 CLEANING UP WEBSOCKET PRODUCTS HOOK');
      clearTimeout(setupTimer);
      
      if (channelRef.current) {
        console.log('🔌 UNSUBSCRIBING FROM REAL-TIME CHANNEL');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setConnected(false);
      }
    };
  }, []); // Empty dependency array to run only once

  // Add effect to log products state changes
  useEffect(() => {
    console.log('📊 PRODUCTS STATE UPDATED:', {
      count: products.length,
      timestamp: new Date().toLocaleTimeString(),
      productNames: products.map(p => p.name).slice(0, 3) // Show first 3 product names
    });
  }, [products]);

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