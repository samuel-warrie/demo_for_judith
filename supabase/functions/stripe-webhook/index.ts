import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract checkout session ID at the beginning
        const checkoutSessionId = (stripeData as Stripe.Checkout.Session).id;
        console.log('Processing one-time payment for session:', checkoutSessionId);
        
        // Fetch line items from the checkout session
        const lineItems = await stripe.checkout.sessions.listLineItems(checkoutSessionId, {
          expand: ['data.price.product']
        });
        
        console.log('Fetched line items from Stripe:', lineItems.data.length, 'items');
        console.log('Line items data:', JSON.stringify(lineItems.data, null, 2));

        // Map line items to our database format
        const formattedLineItems = lineItems.data.map(item => ({
          product_id: typeof item.price?.product === 'object' ? item.price.product.id : item.price?.product,
          name: typeof item.price?.product === 'object' ? item.price.product.name : 'Unknown Product',
          description: typeof item.price?.product === 'object' ? item.price.product.description : null,
          unit_amount: item.price?.unit_amount || 0,
          quantity: item.quantity || 1,
          currency: item.price?.currency || 'eur',
          image_url: typeof item.price?.product === 'object' && item.price.product.images ? item.price.product.images[0] : null
        }));
        
        console.log('Formatted line items for database:', JSON.stringify(formattedLineItems, null, 2));

        // Extract the necessary information from the session
        const {
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
          shipping_details,
        } = stripeData as Stripe.Checkout.Session;

        // Extract shipping address information
        const shippingData = shipping_details ? {
          shipping_name: shipping_details.name,
          shipping_address_line1: shipping_details.address?.line1,
          shipping_address_line2: shipping_details.address?.line2,
          shipping_address_city: shipping_details.address?.city,
          shipping_address_state: shipping_details.address?.state,
          shipping_address_postal_code: shipping_details.address?.postal_code,
          shipping_address_country: shipping_details.address?.country,
        } : {};

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id: checkoutSessionId,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
          line_items: formattedLineItems,
          ...shippingData,
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          console.error('Order data that failed to insert:', {
            checkout_session_id: checkoutSessionId,
            payment_intent_id: payment_intent,
            customer_id: customerId,
            amount_subtotal,
            amount_total,
            currency,
            payment_status,
            status: 'completed',
            line_items: formattedLineItems,
            ...shippingData,
          });
          return;
        }
        
        console.info(`Successfully processed one-time payment for session: ${checkoutSessionId}`);
        console.info(`Inserted ${formattedLineItems.length} line items into database`);
        
        // Update product stock quantities
        console.log('📦 Updating product stock quantities...');
        
        for (const item of formattedLineItems) {
          try {
            // Find the product by stripe_product_id
            const { data: productData, error: productError } = await supabase
              .from('products')
              .select('id, stock_quantity, name')
              .eq('stripe_product_id', item.product_id)
              .single();

            if (productError || !productData) {
              console.error(`❌ Product not found for Stripe product ID: ${item.product_id}`, productError);
              continue;
            }

            const newStock = Math.max(0, productData.stock_quantity - item.quantity);
            
            const { error: updateError } = await supabase
              .from('products')
              .update({ stock_quantity: newStock })
              .eq('id', productData.id);

            if (updateError) {
              console.error(`❌ Failed to update stock for product ${productData.name}:`, updateError);
            } else {
              console.log(`✅ Updated stock for ${productData.name}: ${productData.stock_quantity} → ${newStock}`);
            }
          } catch (stockError) {
            console.error('❌ Error updating product stock:', stockError);
          }
        }
        
        console.log('📦 Stock update process completed');
      } catch (error) {
        console.error('Error processing one-time payment:', error);
        console.error('Customer ID:', customerId);
        console.error('Stripe data:', JSON.stringify(stripeData, null, 2));
      }
    }
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}