import React, { useEffect, useState } from 'react';
import { CheckCircle, Calendar, ExternalLink } from 'lucide-react';

export default function BookingSuccessPage() {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Redirect to Fresha booking system
          window.location.href = 'https://fresha.com';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(countdownInterval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10 text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your €10 booking deposit has been processed. You'll now be redirected to complete your appointment booking.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-lg">
                {countdown}
              </div>
              <p className="text-sm text-gray-600">
                Redirecting to booking system...
              </p>
            </div>
          </div>

          <a
            href="https://fresha.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 transition-colors"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Continue to Fresha Booking
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </div>
      </div>
    </div>
  );
}