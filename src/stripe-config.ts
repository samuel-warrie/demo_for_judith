export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  mode: 'payment' | 'subscription';
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_ShDmQ81Ch6zEFT',
    priceId: 'price_1RlpKxRgarWvqwqjQZeVurVk', // ⚠️ REPLACE WITH YOUR ACTUAL PRICE ID
    name: 'Vitamin C Brightening Serum',
    description: 'Powerful antioxidant serum that brightens and evens skin tone',
    price: 0.50,
    mode: 'payment'
  },
  {
    id: 'prod_ShDkXYoMbMuExj',
    priceId: 'price_1RlpJ0RgarWvqwqjUV6fjFyi', // ⚠️ REPLACE WITH YOUR ACTUAL PRICE ID
    name: 'Hydrating Face Moisturizer',
    description: '24-hour hydration with hyaluronic acid and ceramides',
    price: 0.50,
    mode: 'payment'
  },
  {
    id: 'prod_ShDjtqgHABMCLR',
    priceId: 'price_1RlpHlRgarWvqwqj6YCIhYXw', // ⚠️ REPLACE WITH YOUR ACTUAL PRICE ID
    name: 'Matte Liquid Lipstick Set',
    description: 'Long-lasting matte finish in 3 trending shades',
    price: 0.50,
    mode: 'payment'
  },
  {
    id: 'prod_ShDhENJOOa5LDZ',
    priceId: 'price_1RlpFzRgarWvqwqjsE2hZmtB', // ⚠️ REPLACE WITH YOUR ACTUAL PRICE ID
    name: 'Gentle Cleansing Oil',
    description: 'Removes makeup and impurities without stripping skin',
    price: 0.50,
    mode: 'payment'
  },
  {
    id: 'prod_ShDfIKMfG8QOad',
    priceId: 'price_1RlpDoRgarWvqwqjidfY0qEI', // ⚠️ REPLACE WITH YOUR ACTUAL PRICE ID
    name: 'Eyeshadow Palette',
    description: '12 versatile shades from neutral to bold',
    price: 0.50,
    mode: 'payment'
  }
];

// Booking deposit product
export const bookingDepositProduct: StripeProduct = {
  id: 'booking-deposit',
  priceId: 'price_1RlpKxRgarWvqwqjQZeVurVk', // Using existing price ID temporarily
  name: 'Booking Deposit',
  description: 'Non-refundable booking deposit for hair appointment',
  price: 0.50, // Matching the existing price for now
  mode: 'payment'
};

export function getStripeProductByName(name: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.name === name);
}

export function getStripeProductById(id: string): StripeProduct | undefined {
  if (id === 'booking-deposit') {
    return bookingDepositProduct;
  }
  return stripeProducts.find(product => product.id === id);
}