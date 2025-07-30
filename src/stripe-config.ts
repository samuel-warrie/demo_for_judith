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
    priceId: 'price_1RlpKxRgarWvqwqjQZeVurVk',
    name: 'Vitamin C Brightening Serum',
    description: 'Powerful antioxidant serum that brightens and evens skin tone',
    price: 0.50,
    mode: 'payment'
  },
  {
    id: 'prod_ShDkXYoMbMuExj',
    priceId: 'price_1RlpJ0RgarWvqwqjUV6fjFyi',
    name: 'Hydrating Face Moisturizer',
    description: '24-hour hydration with hyaluronic acid and ceramides',
    price: 0.50,
    mode: 'payment'
  },
  {
    id: 'prod_ShDjtqgHABMCLR',
    priceId: 'price_1RlpHlRgarWvqwqj6YCIhYXw',
    name: 'Matte Liquid Lipstick Set',
    description: 'Long-lasting matte finish in 3 trending shades',
    price: 0.50,
    mode: 'payment'
  },
  {
    id: 'prod_ShDhENJOOa5LDZ',
    priceId: 'price_1RlpFzRgarWvqwqjsE2hZmtB',
    name: 'Gentle Cleansing Oil',
    description: 'Removes makeup and impurities without stripping skin',
    price: 0.50,
    mode: 'payment'
  },
  {
    id: 'prod_ShDfIKMfG8QOad',
    priceId: 'price_1RlpDoRgarWvqwqjidfY0qEI',
    name: 'Eyeshadow Palette',
    description: '12 versatile shades from neutral to bold',
    price: 0.50,
    mode: 'payment'
  }
];

// Appointment deposit product
export const bookingDepositProduct: StripeProduct = {
  id: 'prod_Sm4P1ctm4PC3cM',
  priceId: 'price_1RqWGxRgarWvqwqjs55VWrlI',
  name: 'Appointment Deposit',
  description: 'This is a deposit of ten euros, and it will be deducted from your final bill.',
  price: 10.00,
  mode: 'payment'
};

export function getStripeProductByName(name: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.name === name);
}

export function getStripeProductById(id: string): StripeProduct | undefined {
  if (id === 'prod_Sm4P1ctm4PC3cM') {
    return bookingDepositProduct;
  }
  return stripeProducts.find(product => product.id === id);
}