/*
  # Enable Realtime for products table

  1. Configuration
    - Enable real-time updates for the products table
    - This allows the frontend to receive live updates when products are modified

  2. Security
    - Realtime respects existing RLS policies
    - Only authorized users will receive updates they're allowed to see
*/

-- Enable realtime for products table
ALTER PUBLICATION supabase_realtime ADD TABLE products;