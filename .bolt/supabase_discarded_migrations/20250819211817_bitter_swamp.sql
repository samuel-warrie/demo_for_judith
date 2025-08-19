/*
  # Add products table to real-time publication

  1. Real-time Configuration
    - Add `products` table to the `supabase_realtime` publication
    - This enables real-time updates for product changes
    - Required for WebSocket-based live updates in the frontend

  2. Security
    - Ensure public users can receive real-time updates for products
    - This is safe since products are already publicly readable

  3. Notes
    - After this migration, the products table will appear in Database → Publications
    - Real-time updates should work immediately without page refresh
    - Changes to products will be pushed to all connected clients
*/

-- Add the products table to the supabase_realtime publication
-- This enables real-time updates for the products table
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- Ensure there's a policy allowing real-time access for products
-- This is required for the real-time messages to be delivered
DO $$
BEGIN
  -- Check if the policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname = 'allow realtime for all'
  ) THEN
    -- Create the policy if it doesn't exist
    CREATE POLICY "allow realtime for all"
      ON products
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;