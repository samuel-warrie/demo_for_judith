/*
  # Enable real-time for products table

  1. Publications
    - Add `products` table to the `supabase_realtime` publication
    - This enables real-time updates for INSERT, UPDATE, DELETE operations

  2. Security
    - Ensure RLS policies allow real-time access
    - Add policy for real-time messages if needed
*/

-- Add the products table to the supabase_realtime publication
-- This enables real-time updates for the products table
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- Ensure there's a policy for real-time messages (if the table exists)
-- This is needed for real-time authorization
DO $$
BEGIN
  -- Check if realtime.messages table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    -- Create policy for authenticated users to receive real-time messages
    CREATE POLICY IF NOT EXISTS "authenticated can receive broadcasts"
    ON "realtime"."messages"
    FOR SELECT
    TO authenticated
    USING ( true );
  END IF;
END $$;