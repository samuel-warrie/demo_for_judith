import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-12-18.acacia',
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

    const { price_id, line_items, success_url, cancel_url, mode, metadata } = await req.json();

    // Validate basic parameters
    if (!success_url || !cancel_url || !mode) {
      return corsResponse({ error: 'Missing required parameters' }, 400);
    }

    if (!['payment', 'subscription'].includes(mode)) {
      return corsResponse({ error: 'Mode must be payment or subscription' }, 400);
    }

    // Process line items - create Stripe products/prices if needed
    let processedLineItems = [];

    if (line_items && Array.isArray(line_items) && line_items.length > 0) {
      // Multi-item checkout
      for (const item of line_items) {
        if (!item.quantity || item.quantity < 1) {
          return corsResponse({ error: 'Each item must have quantity >= 1' }, 400);
        }

        let priceId = item.price_id;

        // If no price_id, create product and price on the fly
        if (!priceId && item.product_id && item.product_name && item.product_price) {
          try {
            // Fetch from Supabase to check if we already have Stripe IDs
            const { data: product } = await supabase
              .from('products')
              .select('stripe_product_id, stripe_price_id')
              .eq('id', item.product_id)
              .maybeSingle();

            if (product?.stripe_price_id) {
              priceId = product.stripe_price_id;
            } else {
              // Create Stripe product and price
              const stripeProduct = await stripe.products.create({
                name: item.product_name,
                description: item.product_description || undefined,
                images: item.product_image ? [item.product_image] : undefined,
                metadata: {
                  supabase_product_id: item.product_id,
                },
              });

              const stripePrice = await stripe.prices.create({
                product: stripeProduct.id,
                unit_amount: Math.round(item.product_price * 100),
                currency: 'dkk',
              });

              priceId = stripePrice.id;

              // Update Supabase with new Stripe IDs
              await supabase
                .from('products')
                .update({
                  stripe_product_id: stripeProduct.id,
                  stripe_price_id: stripePrice.id,
                })
                .eq('id', item.product_id);

              console.log(`Created Stripe product ${stripeProduct.id} for ${item.product_name}`);
            }
          } catch (err: any) {
            console.error(`Failed to create Stripe product for ${item.product_name}:`, err.message);
            return corsResponse({ error: `Failed to process product: ${item.product_name}` }, 500);
          }
        }

        if (!priceId) {
          return corsResponse({ error: 'Each item must have price_id or product details' }, 400);
        }

        processedLineItems.push({
          price: priceId,
          quantity: item.quantity,
        });
      }
    } else if (price_id) {
      // Single item with existing price_id
      processedLineItems = [{
        price: price_id,
        quantity: 1,
      }];
    } else {
      return corsResponse({ error: 'Either price_id or line_items required' }, 400);
    }

    // Create checkout session
    const sessionConfig: any = {
      payment_method_types: ['card', 'mobilepay'],
      mode,
      success_url,
      cancel_url,
      customer_creation: 'always',
      line_items: processedLineItems,
      custom_fields: [
        {
          key: 'full_name',
          label: {
            type: 'custom',
            custom: 'Full Name'
          },
          type: 'text',
          text: {
            minimum_length: 1,
            maximum_length: 100
          }
        }
      ],
      ...(metadata && { metadata }),
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log(`Created checkout session ${session.id}`);

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`Checkout error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});

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