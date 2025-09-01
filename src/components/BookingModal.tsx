import React, { useState } from 'react';
import { X, Calendar, Check, Camera, FileText, CreditCard, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { bookingDepositProduct } from '../stripe-config';

type MediaConsentAdult = 'visible' | 'none' | 'hidden';
type MediaConsentChild = 'child-visible' | 'child-none' | 'child-hidden';

interface BookingModalProps {
  onClose: () => void;
}

export default function BookingModal({ onClose }: BookingModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'initial' | 'terms' | 'payment'>('initial');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [adultMediaConsent, setAdultMediaConsent] = useState<MediaConsentAdult | ''>('');
  const [childMediaConsent, setChildMediaConsent] = useState<MediaConsentChild | ''>('');
  const [hasMinor, setHasMinor] = useState(false);
  const [loading, setLoading] = useState(false);

  const canProceed = adultMediaConsent !== '' && (!hasMinor || childMediaConsent !== '') && termsAccepted;

  const handlePayDeposit = async () => {
    // Store booking intent in localStorage before redirecting to Stripe
    localStorage.setItem('booking_intent', JSON.stringify({
      timestamp: Date.now(),
      adultMediaConsent,
      childMediaConsent: hasMinor ? childMediaConsent : null,
      hasMinor,
      termsAccepted: true
    }));
    
    // Close modal and redirect to Stripe payment link
    onClose();
    window.location.href = 'https://buy.stripe.com/test_fZu8wR3TmfsPbWt8HM8so00';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="absolute inset-4 md:inset-8 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-black" />
              <h2 className="text-xl font-bold text-gray-900">
                {step === 'initial' ? t('booking.title') : 
                 step === 'terms' ? t('booking.termsAndConditions') : 
                 t('booking.paymentStep')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {(step === 'initial' || step === 'terms') && (
              <div className="p-8">
                <div className="max-w-4xl mx-auto">
                  {/* Terms Content */}
                  <div className="bg-gray-50 rounded-xl p-6 mb-8 max-h-96 overflow-y-auto">
                    <div className="space-y-6 text-sm text-gray-700">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">1. Bookings and Deposits</h3>
                        <ul className="space-y-1 ml-4">
                          <li>• Appointments require booking via phone or online.</li>
                          <li>• A deposit of €10 is required upon booking. This amount will be included in your final bill.</li>
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
                        <h3 className="font-semibold text-gray-900 mb-2">5. Media Release and Marketing</h3>
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
                  <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <Camera className="w-5 h-5 text-gray-700" />
                      <h3 className="font-semibold text-gray-900">{t('booking.mediaConsent')}</h3>
                    </div>

                    {/* Adult Media Consent */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-800 mb-3">Media Consent – Adults</h4>
                      <p className="text-sm text-gray-600 mb-3">Please select one:</p>
                      <div className="space-y-3">
                        <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
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
                        <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
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
                        <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
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
                    <div className="mb-6">
                      <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
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
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-800 mb-3">Media Consent – Children (Under 18)</h4>
                        <p className="text-sm text-gray-600 mb-3">To be completed by a parent or legal guardian:</p>
                        <div className="space-y-3">
                          <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
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
                          <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
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
                          <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
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
                    <div className="border-t border-gray-200 pt-6">
                      <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-1 rounded"
                        />
                        <span className="text-sm text-gray-700">
                          <span className="font-medium">I have read and agree to all terms and conditions</span>
                          <span className="text-red-500"> *</span>
                        </span>
                      </label>
                      {!canProceed && (
                        <p className="text-xs text-gray-500 mt-2 ml-6">
                          Please complete all consent selections and accept the terms to continue.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'payment' && (
              <div className="p-8 text-center">
                <div className="max-w-md mx-auto">
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('booking.termsAccepted')}</h3>
                  <p className="text-gray-600 mb-8">
                    {t('booking.thankYou')}
                  </p>
                  
                  <div className="bg-gray-50 rounded-xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-700">{t('booking.bookingDeposit')}</span>
                      <span className="text-2xl font-bold text-gray-900">€{bookingDepositProduct.price.toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>• {t('booking.depositFeatures.appliedToBill')}</p>
                      <p>• {t('booking.depositFeatures.securesSlot')}</p>
                      <p>• {t('booking.depositFeatures.nonRefundable')}</p>
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
                        <span>{t('booking.payBookingDeposit')}</span>
                      </>
                    )}
                  </button>

                  <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <Shield className="w-4 h-4" />
                    <span>{t('booking.securePayment')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex justify-between items-center">
              {(step === 'initial' || step === 'terms') && (
                <>
                  <button
                    onClick={onClose}
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setStep('payment')}
                    disabled={!canProceed}
                    className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                      canProceed
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {t('booking.acceptTerms')}
                  </button>
                </>
              )}
              {step === 'payment' && (
                <button
                  onClick={() => setStep('initial')}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {t('booking.back')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}