import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-12-18.acacia',
    });

    // Get all products that don't have Stripe IDs
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .or('stripe_product_id.is.null,stripe_price_id.is.null');

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All products already synced', synced: 0 }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const syncedProducts = [];

    for (const product of products) {
      try {
        // Create or update Stripe product
        let stripeProduct;
        if (product.stripe_product_id) {
          stripeProduct = await stripe.products.retrieve(product.stripe_product_id);
        } else {
          stripeProduct = await stripe.products.create({
            name: product.name,
            description: product.description || undefined,
            images: product.image_url ? [product.image_url] : undefined,
            metadata: {
              supabase_product_id: product.id,
              category: product.category,
              brand: product.brand || '',
            },
          });
        }

        // Create or update Stripe price
        let stripePrice;
        if (product.stripe_price_id) {
          stripePrice = await stripe.prices.retrieve(product.stripe_price_id);
        } else {
          stripePrice = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: Math.round(product.price * 100), // Convert to cents
            currency: 'dkk',
          });
        }

        // Update product in Supabase with Stripe IDs
        const { error: updateError } = await supabase
          .from('products')
          .update({
            stripe_product_id: stripeProduct.id,
            stripe_price_id: stripePrice.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id);

        if (updateError) {
          console.error(`Failed to update product ${product.id}:`, updateError);
        } else {
          syncedProducts.push({
            id: product.id,
            name: product.name,
            stripe_product_id: stripeProduct.id,
            stripe_price_id: stripePrice.id,
          });
        }
      } catch (error: any) {
        console.error(`Failed to sync product ${product.name}:`, error.message);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Products synced successfully',
        synced: syncedProducts.length,
        products: syncedProducts,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
