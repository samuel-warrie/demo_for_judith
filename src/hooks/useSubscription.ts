import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface SubscriptionData {
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .maybeSingle();

        if (error) {
          console.error('Error fetching subscription:', error);
          setSubscription(null);
        } else {
          setSubscription(data);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const getSubscriptionPlanName = () => {
    if (!subscription || !subscription.price_id) {
      return 'No active subscription';
    }

    // Map price IDs to plan names
    const planNames: { [key: string]: string } = {
      'price_1RlpKxRgarWvqwqjQZeVurVk': 'Vitamin C Serum Plan',
      'price_1RlpJ0RgarWvqwqjUV6fjFyi': 'Moisturizer Plan',
      'price_1RlpHlRgarWvqwqj6YCIhYXw': 'Lipstick Plan',
      'price_1RlpFzRgarWvqwqjsE2hZmtB': 'Cleansing Oil Plan',
      'price_1RlpDoRgarWvqwqjidfY0qEI': 'Eyeshadow Plan',
    };

    return planNames[subscription.price_id] || 'Unknown Plan';
  };

  return {
    subscription,
    loading,
    planName: getSubscriptionPlanName(),
    isActive: subscription?.subscription_status === 'active',
  };
}