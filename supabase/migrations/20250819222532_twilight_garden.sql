/*
  # Fix Real-time Synchronization for Products Table

  1. Publications
    - Add products table to supabase_realtime publication
    - Enable real-time for all operations (INSERT, UPDATE, DELETE)

  2. Security
    - Add RLS policy for real-time access to products table
    - Ensure public can receive real-time updates

  3. Verification
    - Check if publication exists and create if needed
    - Verify table is properly added to publication
*/

-- Ensure the supabase_realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add products table to the real-time publication
DO $$
BEGIN
  -- Check if products table is already in the publication
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  END IF;
END $$;

-- Ensure there's a policy for real-time access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname = 'Enable realtime for all users'
  ) THEN
    CREATE POLICY "Enable realtime for all users" 
    ON products 
    FOR SELECT 
    TO public 
    USING (true);
  END IF;
END $$;

-- Grant necessary permissions for real-time
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON products TO postgres, anon, authenticated, service_role;