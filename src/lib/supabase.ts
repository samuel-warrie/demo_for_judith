import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Debug environment variables
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Present' : 'Missing');

let supabase;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - some features may not work');
  // Create a dummy client to prevent app crashes
  supabase = createClient('https://dummy.supabase.co', 'dummy-key', {
    auth: { persistSession: false }
  });
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: localStorage
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    // Add global options for better debugging
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-web'
      }
    }
  });
  
  // Add connection status logging
  supabase.realtime.onOpen(() => {
    console.log('✅ Supabase real-time connection opened');
  });
  
  supabase.realtime.onClose(() => {
    console.log('🔒 Supabase real-time connection closed');
  });
  
  supabase.realtime.onError((error) => {
    console.error('❌ Supabase real-time error:', error);
  });
}

export { supabase };