/*
  # Add RLS policy for real-time messages

  1. Security
    - Add policy to allow authenticated users to receive real-time broadcasts
    - This enables the postgres_changes subscription to work properly

  This policy is required for Supabase real-time to function with authenticated users.
*/

-- Enable RLS on realtime.messages if not already enabled
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to receive real-time broadcasts
CREATE POLICY IF NOT EXISTS "authenticated can receive broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

-- Also allow public access for real-time (some setups require this)
CREATE POLICY IF NOT EXISTS "public can receive broadcasts"
ON realtime.messages
FOR SELECT
TO public
USING (true);