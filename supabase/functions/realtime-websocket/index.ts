import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Store active WebSocket connections
const connections = new Map<string, WebSocket>();

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Handle WebSocket upgrade
    if (req.headers.get('upgrade') === 'websocket') {
      const { socket, response } = Deno.upgradeWebSocket(req);
      const connectionId = crypto.randomUUID();
      
      socket.onopen = () => {
        console.log(`WebSocket connection opened: ${connectionId}`);
        connections.set(connectionId, socket);
        
        // Send initial connection confirmation
        socket.send(JSON.stringify({
          type: 'connection',
          status: 'connected',
          connectionId
        }));
      };

      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received message:', message);
          
          if (message.type === 'subscribe' && message.table === 'products') {
            // Send current products data
            const { data: products, error } = await supabase
              .from('products')
              .select('*')
              .order('created_at', { ascending: false });
            
            if (!error && products) {
              socket.send(JSON.stringify({
                type: 'initial_data',
                table: 'products',
                data: products
              }));
            }
          }
        } catch (err) {
          console.error('Error processing message:', err);
        }
      };

      socket.onclose = () => {
        console.log(`WebSocket connection closed: ${connectionId}`);
        connections.delete(connectionId);
      };

      socket.onerror = (error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
        connections.delete(connectionId);
      };

      return response;
    }

    // Handle HTTP requests for broadcasting changes
    if (req.method === 'POST') {
      const { table, action, data } = await req.json();
      
      console.log(`Broadcasting ${action} on ${table} to ${connections.size} connections`);
      
      // Broadcast to all connected clients
      const message = JSON.stringify({
        type: 'database_change',
        table,
        action,
        data,
        timestamp: new Date().toISOString()
      });

      for (const [connectionId, socket] of connections) {
        try {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(message);
          } else {
            connections.delete(connectionId);
          }
        } catch (err) {
          console.error(`Error sending to connection ${connectionId}:`, err);
          connections.delete(connectionId);
        }
      }

      return new Response(
        JSON.stringify({ success: true, connections: connections.size }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error('WebSocket server error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});