import { Product } from '../types';

export const products: Product[] = [
  {
    id: 1,
    name: "Vitamin C Brightening Serum",
    price: 0.50,
    image: "https://images.pexels.com/photos/8617634/pexels-photo-8617634.jpeg?auto=compress&cs=tinysrgb&w=500",
    category: "skincare",
    rating: 4.8,
    reviewCount: 324,
    description: "Powerful antioxidant serum that brightens and evens skin tone",
    stock: 15,
    lowStockThreshold: 5
  },
  {
    id: 2,
    name: "Hydrating Face Moisturizer",
    price: 0.50,
    image: "https://images.pexels.com/photos/3685538/pexels-photo-3685538.jpeg?auto=compress&cs=tinysrgb&w=500",
    category: "skincare",
    rating: 4.6,
    reviewCount: 198,
    description: "24-hour hydration with hyaluronic acid and ceramides",
    stock: 3,
    lowStockThreshold: 5
  },
  {
    id: 3,
    name: "Matte Liquid Lipstick Set",
    price: 0.50,
    image: "https://images.pexels.com/photos/2113855/pexels-photo-2113855.jpeg?auto=compress&cs=tinysrgb&w=500",
    category: "makeup",
    rating: 4.7,
    reviewCount: 267,
    description: "Long-lasting matte finish in 3 trending shades",
    stock: 25,
    lowStockThreshold: 10
  },
  {
    id: 4,
    name: "Gentle Cleansing Oil",
    price: 0.50,
    image: "https://images.pexels.com/photos/3685538/pexels-photo-3685538.jpeg?auto=compress&cs=tinysrgb&w=500",
    category: "skincare",
    rating: 4.9,
    reviewCount: 412,
    description: "Removes makeup and impurities without stripping skin",
    stock: 0,
    lowStockThreshold: 5
  },
  {
    id: 5,
    name: "Eyeshadow Palette",
    price: 0.50,
    image: "https://images.pexels.com/photos/2113855/pexels-photo-2113855.jpeg?auto=compress&cs=tinysrgb&w=500",
    category: "makeup",
    rating: 4.5,
    reviewCount: 189,
    description: "12 versatile shades from neutral to bold",
    stock: 8,
    lowStockThreshold: 10
  },
];

export const categories = [
  { id: 'all', name: 'All Products', count: products.length },
  { id: 'skincare', name: 'Skincare', count: products.filter(p => p.category === 'skincare').length },
  { id: 'makeup', name: 'Makeup', count: products.filter(p => p.category === 'makeup').length }
];