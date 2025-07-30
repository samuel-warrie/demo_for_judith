import React, { useState } from 'react';
import { Check, Calendar, CreditCard, FileText, Shield, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getStripeProductById } from '../stripe-config';

type MediaConsentAdult = 'visible' | 'none' | 'hidden';
type MediaConsentChild = 'child-visible' | 'child-none' | 'child-hidden';

export default function BookingPage() {
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [adultMediaConsent, setAdultMediaConsent] = useState<MediaConsentAdult | ''>('');
  const [childMediaConsent, setChildMediaConsent] = useState<MediaConsentChild | ''>('');
  const [hasMinor, setHasMinor] = useState(false);
  const [loading, setLoading] = useState(false);

  const canAcceptTerms = adultMediaConsent !== '' && (!hasMinor || childMediaConsent !== '');

  const handleBookNow = () => {
    setShowTerms(true);
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setShowTerms(false);
  };

  const handlePayDeposit = async () => {
    console.log('🏦 Initiating booking deposit payment');
    
    // Get the booking deposit product configuration
    const depositProduct = getStripeProductById('booking-deposit');
    if (!depositProduct) {
      console.error('❌ Booking deposit product not configured');
      alert('Booking deposit configuration error. Please contact support.');
      return;
    }

    setLoading(true);
    console.log('⏳ Creating checkout session for booking deposit...');

    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: depositProduct.priceId,
          mode: 'payment',
          success_url: 'https://www.fresha.com',
          cancel_url: window.location.href,
          metadata: {
            booking_type: 'hair_appointment',
            adult_media_consent: adultMediaConsent,
            child_media_consent: hasMinor ? childMediaConsent : 'n/a',
          }
        }
      });

      if (error) {
        console.error('❌ Checkout error:', error);
        alert(`Payment error: ${error.message || 'Unknown error'}`);
        return;
      }

      if (data?.url) {
        console.log('✅ Redirecting to payment:', data.url);
        window.location.href = data.url;
      } else {
        console.error('❌ No checkout URL received');
        alert('Payment setup failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      alert(`Unexpected error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Your Appointment</h1>
            <p className="text-gray-600">Professional hair services at Beloved Beauty & Hair Studio</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showTerms && !termsAccepted && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <Calendar className="w-16 h-16 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Book?</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Professional braiding, styling, and hair care services. A €10 booking deposit is required 
              to secure your appointment and will be applied to your final bill.
            </p>
            <button
              onClick={handleBookNow}
              className="bg-black text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            >
              Book Now
            </button>
          </div>
        )}

        {showTerms && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Terms Header */}
            <div className="bg-gray-50 px-8 py-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">Terms and Conditions</h2>
              </div>
              <p className="text-gray-600 mt-2">Please read and accept our terms before proceeding</p>
            </div>

            {/* Terms Content */}
            <div className="p-8 max-h-96 overflow-y-auto">
              <div className="space-y-6 text-sm text-gray-700">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">1. Bookings and Deposits</h3>
                  <ul className="space-y-1 ml-4">
                    <li>• Appointments require booking via phone or online.</li>
                    <li>• A deposit of 10 euros is required upon booking. This amount will be included in your final bill.</li>
                    <li>• Deposits are non-refundable if the appointment is canceled outside the permitted window.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2. Hair Preparation</h3>
                  <ul className="space-y-1 ml-4">
                    <li>• Hair washing/shampooing and detangling services are offered at a fee before any hair do.</li>
                    <li>• Otherwise, client's hair must be washed 1–3 days before appointment, detangled, blow-dried if required, and free of styling products.</li>
                    <li>• The salon reserves the right to refuse service if hair preparation conditions aren't met.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3. Cancellations and No-Shows</h3>
                  <ul className="space-y-1 ml-4">
                    <li>• Cancellations require notice of 48 hours.</li>
                    <li>• Less than 48 hours: deposit will be forfeited.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">4. Late Arrivals</h3>
                  <ul className="space-y-1 ml-4">
                    <li>• Clients are expected promptly. Arriving more than 30 minutes late without notice may require rescheduling and loss of deposit.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">5. Home Visits and Mobile Calls</h3>
                  <ul className="space-y-1 ml-4">
                    <li>• Home-call services will be offered under special circumstances and are subject to extra travel fees.</li>
                    <li>• Bookings must include accurate address.</li>
                    <li>• Mobile/home calls require a safe, clutter-free workspace.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">6. Payment Terms</h3>
                  <ul className="space-y-1 ml-4">
                    <li>• Balance due after service via cash, card, or bank transfer.</li>
                    <li>• Final price may vary by service add-ons or product purchase.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">7. Hair Length and Service</h3>
                  <ul className="space-y-1 ml-4">
                    <li>• Minimum natural hair length for braiding services must be at least 1–2 inches.</li>
                    <li>• Salon may decline or adjust pricing if hair is shorter or unsuitable for grip.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">8. Service Satisfaction and Redo</h3>
                  <ul className="space-y-1 ml-4">
                    <li>• If unsatisfied, clients may contact within 7–14 days for a free correction (same service type).</li>
                    <li>• Alterations made outside the salon, or maintenance negligence, void guarantees.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">9. Salon Rights</h3>
                  <ul className="space-y-1 ml-4">
                    <li>• We reserve the right to refuse service to aggressive or disrespectful clients.</li>
                    <li>• Salon liability is limited; clients must disclose health, skin, or pregnancy conditions.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">10. Health and Safety</h3>
                  <ul className="space-y-1 ml-4">
                    <li>• Salon hygiene follows strict sanitation protocols.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">11. Media Release and Marketing</h3>
                  <div className="ml-4 space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Adult Clients</h4>
                      <p className="mb-2">
                        By receiving services at Beloved Beauty & Hair Studio, you agree that videos and/or photos may be taken during or after your appointment for educational or promotional use on platforms such as Instagram, TikTok, Facebook, or our website.
                      </p>
                      <p className="mb-2">
                        We will ensure your identity is protected by concealing your face unless you provide explicit, written consent for full visibility.
                      </p>
                      <p>
                        If you do not wish to have your service captured in any way, please inform us before your appointment begins.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Children / Minors (under 18)</h4>
                      <p className="mb-2">
                        For clients under the age of 18, media may only be captured or used for marketing purposes with the consent of a parent or legal guardian.
                      </p>
                      <p className="mb-2">
                        All content involving minors will ensure the child's face is not shown unless specific parental permission is granted.
                      </p>
                      <p>
                        The parent/guardian has the right to withdraw media consent at any time, and content will be removed from our platforms within a reasonable period.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Media Consent Section */}
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Camera className="w-5 h-5 text-gray-700" />
                  <h3 className="font-semibold text-gray-900">Media Consent</h3>
                </div>

                {/* Adult Media Consent */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Media Consent – Adults</h4>
                  <div className="space-y-2">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="adultConsent"
                        value="visible"
                        checked={adultMediaConsent === 'visible'}
                        onChange={(e) => setAdultMediaConsent(e.target.value as MediaConsentAdult)}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700">
                        I give permission for Beloved Beauty and Hair Studio to take photos/videos of my service with my face visible, for use in marketing and promotional materials.
                      </span>
                    </label>
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="adultConsent"
                        value="none"
                        checked={adultMediaConsent === 'none'}
                        onChange={(e) => setAdultMediaConsent(e.target.value as MediaConsentAdult)}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700">
                        I do not give permission for any photos/videos of my service to be used for marketing purposes.
                      </span>
                    </label>
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="adultConsent"
                        value="hidden"
                        checked={adultMediaConsent === 'hidden'}
                        onChange={(e) => setAdultMediaConsent(e.target.value as MediaConsentAdult)}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700">
                        I give permission for media to be taken, but only if my face is not shown (face cropped or blurred).
                      </span>
                    </label>
                  </div>
                </div>

                {/* Minor Checkbox */}
                <div>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasMinor}
                      onChange={(e) => {
                        setHasMinor(e.target.checked);
                        if (!e.target.checked) {
                          setChildMediaConsent('');
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-800">
                      This appointment includes a child/minor (under 18)
                    </span>
                  </label>
                </div>

                {/* Child Media Consent */}
                {hasMinor && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">Media Consent – Children (Under 18)</h4>
                    <p className="text-sm text-gray-600 mb-3">To be completed by a parent or legal guardian:</p>
                    <div className="space-y-2">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="childConsent"
                          value="child-visible"
                          checked={childMediaConsent === 'child-visible'}
                          onChange={(e) => setChildMediaConsent(e.target.value as MediaConsentChild)}
                          className="mt-1"
                        />
                        <span className="text-sm text-gray-700">
                          I give permission for Beloved Beauty and Hair Studio to take photos/videos of my child with their face visible, for use in marketing and promotional materials.
                        </span>
                      </label>
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="childConsent"
                          value="child-none"
                          checked={childMediaConsent === 'child-none'}
                          onChange={(e) => setChildMediaConsent(e.target.value as MediaConsentChild)}
                          className="mt-1"
                        />
                        <span className="text-sm text-gray-700">
                          I do not give permission for any media of my child to be used for marketing purposes.
                        </span>
                      </label>
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="childConsent"
                          value="child-hidden"
                          checked={childMediaConsent === 'child-hidden'}
                          onChange={(e) => setChildMediaConsent(e.target.value as MediaConsentChild)}
                          className="mt-1"
                        />
                        <span className="text-sm text-gray-700">
                          I give permission for media to be taken of my child, but only if their face is not shown.
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Terms Acceptance */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canAcceptTerms}
                      onChange={() => {}} // Controlled by media consent selections
                      disabled={!canAcceptTerms}
                      className="mt-1 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">I have read and agree to the terms and conditions</span>
                      <span className="text-red-500"> *</span>
                    </span>
                  </label>
                  {!canAcceptTerms && (
                    <p className="text-xs text-gray-500 mt-2 ml-6">
                      Please select your media consent preferences above to continue.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Terms Footer */}
            <div className="px-8 py-6 bg-white border-t border-gray-200">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowTerms(false)}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleAcceptTerms}
                  disabled={!canAcceptTerms}
                  className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                    canAcceptTerms
                      ? 'bg-black text-white hover:bg-gray-800'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Accept Terms & Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {termsAccepted && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Terms Accepted</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Thank you for accepting our terms and conditions. To secure your appointment, 
              please pay the €10 booking deposit. This amount will be applied to your final bill.
            </p>
            
            <div className="bg-gray-50 rounded-xl p-6 mb-8 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-700">Booking Deposit:</span>
                <span className="text-2xl font-bold text-gray-900">€10.00</span>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                <p>• Applied to your final bill</p>
                <p>• Secures your appointment slot</p>
                <p>• Non-refundable if canceled &lt; 48hrs</p>
              </div>
            </div>

            <button
              onClick={handlePayDeposit}
              disabled={loading}
              className={`inline-flex items-center space-x-3 px-8 py-4 rounded-xl font-semibold transition-colors ${
                loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>Pay Booking Deposit</span>
                </>
              )}
            </button>

            <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Shield className="w-4 h-4" />
              <span>Secure payment powered by Stripe</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}