/*
  # Create products table

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text, required) - Product name
      - `price` (numeric, required) - Current selling price
      - `original_price` (numeric, optional) - Original price for sale calculations
      - `image_url` (text, required) - Primary product image
      - `category` (text, required) - Product category (skincare, makeup)
      - `subcategory` (text, optional) - Product subcategory
      - `brand` (text, optional) - Product brand
      - `description` (text, optional) - Simple description
      - `descriptions` (jsonb, optional) - Multi-language descriptions
      - `in_stock` (boolean) - Whether product is available
      - `stock_quantity` (integer) - Current stock count
      - `low_stock_threshold` (integer) - When to show low stock warning
      - `rating` (numeric) - Average product rating
      - `review_count` (integer) - Number of reviews
      - `stripe_product_id` (text, optional) - Stripe product ID for payments
      - `stripe_price_id` (text, optional) - Stripe price ID for payments
      - `second_image_url` (text, optional) - Secondary product image
      - `created_at` (timestamp) - Creation timestamp
      - `updated_at` (timestamp) - Last update timestamp

  2. Security
    - Enable RLS on `products` table
    - Add policy for public read access (anonymous users can view products)
    - Add policy for authenticated users to manage products (admin functionality)

  3. Triggers
    - Auto-update `updated_at` timestamp on changes
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  brand TEXT,
  description TEXT,
  descriptions JSONB,
  in_stock BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  rating NUMERIC(2, 1) DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  second_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products (for anonymous users to browse)
CREATE POLICY "Allow public read access to products"
ON products FOR SELECT
TO anon
USING (true);

-- Allow authenticated users to read products
CREATE POLICY "Allow authenticated read access to products"
ON products FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to manage products (for admin functionality)
CREATE POLICY "Allow authenticated users to manage products"
ON products FOR ALL
TO authenticated
USING (true);

-- Add trigger to update the 'updated_at' column on each update
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();