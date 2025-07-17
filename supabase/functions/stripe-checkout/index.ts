import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { price_id, line_items, success_url, cancel_url, mode } = await req.json();

    // Validate parameters - either price_id OR line_items should be provided
    let error;
    
    if (line_items) {
      // Multi-item checkout validation
      error = validateParameters(
        { line_items, success_url, cancel_url, mode },
        {
         line_items: 'array',
          cancel_url: 'string',
          success_url: 'string',
          mode: { values: ['payment', 'subscription'] },
        },
      );
      
      if (!error && (!Array.isArray(line_items) || line_items.length === 0)) {
        error = 'line_items must be a non-empty array';
      }
      
      if (!error) {
        for (const item of line_items) {
          if (!item.price_id || typeof item.price_id !== 'string') {
            error = 'Each line item must have a valid price_id';
            break;
          }
          if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
            error = 'Each line item must have a valid quantity (number >= 1)';
            break;
          }
        }
      }
    } else if (price_id) {
      // Single item checkout validation (backward compatibility)
      error = validateParameters(
        { price_id, success_url, cancel_url, mode },
        {
          cancel_url: 'string',
          price_id: 'string',
          success_url: 'string',
          mode: { values: ['payment', 'subscription'] },
        },
      );
    } else {
      error = 'Either price_id or line_items must be provided';
    }

    if (error) {
      return corsResponse({ error }, 400);
    }

    // Create checkout session with appropriate line items
    let sessionConfig: any = {
      payment_method_types: ['card', 'mobilepay'],
      mode,
      success_url,
      cancel_url,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'DK', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'NO', 'FI', 'AU', 'NZ']
      },
    };
    
    if (line_items) {
      // Multi-item checkout
      sessionConfig.line_items = line_items.map(item => ({
        price: item.price_id,
        quantity: item.quantity,
      }));
    } else {
      // Single item checkout (backward compatibility)
      sessionConfig.line_items = [
        {
          price: price_id,
          quantity: 1,
        },
      ];
    }
    
    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log(`Created checkout session ${session.id} for guest customer`);

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`Checkout error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});

type ExpectedType = 'string' | { values: string[] };
type ExpectedType = 'string' | 'array' | { values: string[] };
type Expectations<T> = { [K in keyof T]: ExpectedType };

function validateParameters<T extends Record<string, any>>(values: T, expected: Expectations<T>): string | undefined {
  for (const parameter in values) {
    const expectation = expected[parameter];
    const value = values[parameter];

    if (expectation === 'string') {
      if (value == null) {
        return `Missing required parameter ${parameter}`;
      }
      if (typeof value !== 'string') {
        return `Expected parameter ${parameter} to be a string got ${JSON.stringify(value)}`;
      }
    } else if (expectation === 'array') {
      if (value == null) {
        return `Missing required parameter ${parameter}`;
      }
      if (!Array.isArray(value)) {
        return `Expected parameter ${parameter} to be an array got ${JSON.stringify(value)}`;
      }
    } else {
      if (!expectation.values.includes(value)) {
        return `Expected parameter ${parameter} to be one of ${expectation.values.join(', ')}`;
      }
    }
  }

  return undefined;
}