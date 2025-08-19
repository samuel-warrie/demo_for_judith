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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connectWebSocket = () => {
    if (!isSupabaseConfigured()) {
      setError('Database is not configured. Please connect to Supabase.');
      setLoading(false);
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const wsUrl = supabaseUrl.replace('https://', 'wss://') + '/functions/v1/realtime-websocket';
      
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully!');
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        
        // Subscribe to products table changes
        ws.send(JSON.stringify({
          type: 'subscribe',
          table: 'products'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message);
          
          switch (message.type) {
            case 'connection':
              console.log('🎉 WebSocket connection confirmed:', message.connectionId);
              break;
              
            case 'initial_data':
              if (message.table === 'products') {
                console.log('📦 Received initial products data:', message.data.length, 'products');
                setProducts(message.data);
                setLoading(false);
              }
              break;
              
            case 'database_change':
              if (message.table === 'products') {
                console.log('🔄 Real-time database change:', message.action, message.data);
                
                switch (message.action) {
                  case 'INSERT':
                    setProducts(prev => [message.data, ...prev]);
                    break;
                  case 'UPDATE':
                    setProducts(prev => prev.map(p => p.id === message.data.id ? message.data : p));
                    break;
                  case 'DELETE':
                    setProducts(prev => prev.filter(p => p.id !== message.data.id));
                    break;
                }
              }
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        setConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        } else {
          console.log('❌ Max reconnection attempts reached, falling back to manual refresh');
          setError('Real-time connection lost. Please refresh manually.');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('WebSocket connection failed');
      };

    } catch (err) {
      console.error('❌ Failed to create WebSocket connection:', err);
      setError('Failed to establish real-time connection');
      setLoading(false);
    }
  };

  const fetchProductsDirectly = async () => {
    if (!isSupabaseConfigured()) {
      setError('Database is not configured. Please connect to Supabase.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('📡 Fetching products directly from database...');
      
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching products:', fetchError);
        setError(`Failed to load products: ${fetchError.message}`);
        setProducts([]);
      } else {
        console.log(`✅ Fetched ${data?.length || 0} products directly`);
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

  const refreshProducts = () => {
    console.log('🔄 Manual refresh triggered');
    fetchProductsDirectly();
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
    // Try WebSocket first, fallback to direct fetch if it fails
    connectWebSocket();
    
    // Fallback: if WebSocket doesn't connect within 5 seconds, fetch directly
    const fallbackTimeout = setTimeout(() => {
      if (!connected && loading) {
        console.log('⏰ WebSocket timeout, falling back to direct fetch');
        fetchProductsDirectly();
      }
    }, 5000);

    return () => {
      // Cleanup
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      clearTimeout(fallbackTimeout);
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