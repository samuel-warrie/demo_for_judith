/*
  # Allow public read access to products table

  1. Security Changes
    - Enable Row Level Security (RLS) on products table if not already enabled
    - Create policy to allow anonymous users to read all products
    - This allows the frontend to fetch product data without authentication

  2. Tables Affected
    - `products` table - now publicly readable for SELECT operations

  3. Notes
    - Only SELECT operations are allowed for anonymous users
    - All other operations (INSERT, UPDATE, DELETE) still require authentication
    - This is safe for an e-commerce site where products should be publicly viewable
*/

-- Enable RLS on the products table if not already enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow anonymous users to read all products
DROP POLICY IF EXISTS "Allow public read access to products" ON products;
CREATE POLICY "Allow public read access to products"
ON products FOR SELECT
TO anon
USING (true);