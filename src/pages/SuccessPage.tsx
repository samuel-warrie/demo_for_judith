import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, Home, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

interface LineItem {
  product_id: string;
  name: string;
  description?: string;
  unit_amount: number;
  quantity: number;
  currency: string;
  image_url?: string;
}

interface OrderDetails {
  sessionId: string;
  orderNumber: string;
  estimatedDelivery: string;
  lineItems: LineItem[];
  totalAmount: number;
  currency: string;
  paymentStatus: string;
}

export default function SuccessPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching order details for session:', sessionId);
        
        // Query the stripe_orders table for this checkout session
        const { data: orderData, error: orderError } = await supabase
          .from('stripe_orders')
          .select('*')
          .eq('checkout_session_id', sessionId)
          .single();

        if (orderError) {
          console.error('Error fetching order:', orderError);
          // If order not found, it might still be processing
          if (orderError.code === 'PGRST116') {
            setError('Order is still being processed. Please check back in a moment.');
          } else {
            setError('Failed to load order details');
          }
          setLoading(false);
          return;
        }

        if (orderData) {
          console.log('Order data retrieved:', orderData);
          
          const orderDetails: OrderDetails = {
            sessionId,
            orderNumber: `ORD-${orderData.id}`,
            estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            lineItems: orderData.line_items || [],
            totalAmount: orderData.amount_total || 0,
            currency: orderData.currency || 'eur',
            paymentStatus: orderData.payment_status || 'paid'
          };
          
          setOrderDetails(orderDetails);
        }
      } catch (err) {
        console.error('Unexpected error fetching order:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [sessionId]);

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Stripe amounts are in cents
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('success.loadingOrder')}</h2>
            <p className="text-gray-600">{t('success.pleaseWait')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10 text-center">
            <div className="flex justify-center mb-6">
              <Package className="w-16 h-16 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('success.orderNotFound')}</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="/"
              className="inline-flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              {t('success.returnToShop')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10 text-center">
            <p className="text-gray-600">No order details available.</p>
          </div>
        </div>
      </div>
    );
    }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10 text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('success.paymentSuccessful')}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {t('success.thankYou')}
          </p>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              {t('success.orderSummary')}
            </h3>
            <div className="space-y-3 text-sm text-gray-600 mb-4">
              <div className="flex justify-between">
                <span>{t('success.orderNumber')}</span>
                <span className="font-medium text-gray-900">{orderDetails.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('success.paymentStatus')}</span>
                <span className="font-medium text-green-600 capitalize">{orderDetails.paymentStatus}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('success.estimatedDelivery')}</span>
                <span className="font-medium text-gray-900">{orderDetails.estimatedDelivery}</span>
              </div>
            </div>
          </div>

          {/* Purchased Items */}
          {orderDetails.lineItems && orderDetails.lineItems.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                <ShoppingBag className="w-5 h-5 mr-2" />
                {t('success.itemsPurchased')}
              </h3>
              <div className="space-y-4">
                {orderDetails.lineItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 bg-white rounded-lg p-4">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                      {item.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                        <span className="font-semibold text-gray-900">
                          {formatPrice(item.unit_amount * item.quantity, item.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Total */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">{t('cart.total')}</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(orderDetails.totalAmount, orderDetails.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <a
              href="/"
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              {t('success.continueShopping')}
            </a>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                {t('success.emailConfirmation')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}