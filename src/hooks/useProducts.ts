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

  const updateSingleProduct = (updatedProduct: Product) => {
    setProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === updatedProduct.id ? updatedProduct : product
      )
    );
  };

  const addNewProduct = (newProduct: Product) => {
    setProducts(prevProducts => {
      const exists = prevProducts.some(p => p.id === newProduct.id);
      if (exists) {
        return prevProducts.map(p => p.id === newProduct.id ? newProduct : p);
      }
      return [newProduct, ...prevProducts];
    });
  };

  const removeProduct = (productId: string) => {
    setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
  };

  const refreshProducts = () => {
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
      setProducts(prevProducts => 
        prevProducts.map(product => 
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
    return product.stock_quantity > 0 && product.stock_quantity <= (product.low_stock_threshold || 5);
  };

  const isOutOfStock = (product: Product) => {
    return (product.stock_quantity || 0) === 0 || !product.in_stock;
  };

  useEffect(() => {
    fetchProducts();
    
    if (isSupabaseConfigured()) {
      // Set up real-time subscription using postgres_changes
      const channel = supabase
        .channel('products-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events: INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'products'
          },
          (payload) => {
            console.log('📡 Real-time postgres change:', payload.eventType, payload);
            
            // Handle different event types
            switch (payload.eventType) {
              case 'INSERT':
                if (payload.new) {
                  console.log('➕ Adding new product:', payload.new);
                  addNewProduct(payload.new as Product);
                }
                break;
              case 'UPDATE':
                if (payload.new) {
                  console.log('🔄 Updating product:', payload.new);
                  updateSingleProduct(payload.new as Product);
                }
                break;
              case 'DELETE':
                if (payload.old) {
                  console.log('🗑️ Removing product:', payload.old);
                  removeProduct((payload.old as Product).id);
                }
                break;
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Postgres changes subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time postgres changes enabled');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('⚠️ Postgres changes channel error');
          } else if (status === 'CLOSED') {
            console.warn('⚠️ Postgres changes channel closed');
          }
        });

      // Optional: Set up minimal polling as fallback (every 5 minutes)
      // This is much less frequent since real-time should handle most updates
      const pollInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          console.log('🔄 Fallback refresh (5min interval)');
          fetchProducts();
        }
      }, 300000); // 5 minutes instead of 50 seconds

      // Cleanup subscription on unmount
      return () => {
        console.log('🧹 Cleaning up real-time subscription');
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    }
  }, []);

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