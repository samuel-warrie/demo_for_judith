/*
  # Enable Realtime for Products Table

  1. Configuration Changes
    - Enable realtime replication for the products table
    - This allows real-time updates to be sent to connected clients

  2. Security
    - Maintains existing RLS policies
    - No changes to authentication or authorization
*/

-- Enable realtime for the products table
ALTER PUBLICATION supabase_realtime ADD TABLE products;