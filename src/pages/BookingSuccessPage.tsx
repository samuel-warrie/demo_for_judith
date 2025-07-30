import React, { useEffect } from 'react';
import { CheckCircle, Calendar, ExternalLink } from 'lucide-react';

export default function BookingSuccessPage() {
  useEffect(() => {
    // Redirect to Fresha after 3 seconds
    const timer = setTimeout(() => {
      window.location.href = 'https://www.fresha.com';
    }, 3000);
    
    return () => clearTimeout(timer);
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
            <p className="text-sm text-gray-600">
              Redirecting to booking system in 3 seconds...
            </p>
          </div>

          <a
            href="https://www.fresha.com/your-booking-link-here"
            className="inline-flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 transition-colors"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Continue to Booking
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </div>
      </div>
    </div>
  );
}