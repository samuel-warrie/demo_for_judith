/*
  # Create Products and Profiles Tables

  1. New Tables
    - products: Stores all product information with multi-language support
    - profiles: User profile data linked to auth.users

  2. Security
    - Enable RLS on both tables
    - Products: Public read access, authenticated write for admins
    - Profiles: Users read own profile, admins read all

  3. Indexes
    - Optimized for category filtering and stock queries
*/

-- Create user_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
  END IF;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL,
  original_price numeric,
  image_url text NOT NULL,
  second_image_url text,
  category text NOT NULL,
  subcategory text,
  brand text,
  description text,
  descriptions jsonb,
  in_stock boolean DEFAULT true,
  stock_quantity integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 5,
  rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  stripe_product_id text,
  stripe_price_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Products policies - public can read, authenticated admins can write
CREATE POLICY "Anyone can view products"
  ON products
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_stripe_product_id ON products(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_products_stripe_price_id ON products(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);