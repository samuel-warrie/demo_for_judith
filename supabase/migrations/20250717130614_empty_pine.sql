/*
  # Add shipping address fields to orders table

  1. New Columns
    - `shipping_name` (text) - Customer's full name for shipping
    - `shipping_address_line1` (text) - Primary address line
    - `shipping_address_line2` (text) - Secondary address line (apartment, suite, etc.)
    - `shipping_address_city` (text) - City name
    - `shipping_address_state` (text) - State/province
    - `shipping_address_postal_code` (text) - ZIP/postal code
    - `shipping_address_country` (text) - Country code (e.g., 'US', 'DK')
    - `delivery_instructions` (text) - Custom delivery instructions from customer

  2. Changes
    - Added shipping address columns to stripe_orders table
    - All fields are nullable since not all orders may require shipping
    - delivery_instructions allows for custom customer notes

  3. Security
    - Existing RLS policies will automatically apply to new columns
    - Users can only view their own shipping information
*/

-- Add shipping address columns to stripe_orders table
DO $$
BEGIN
  -- Add shipping_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'shipping_name'
  ) THEN
    ALTER TABLE stripe_orders ADD COLUMN shipping_name TEXT;
  END IF;

  -- Add shipping_address_line1 column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'shipping_address_line1'
  ) THEN
    ALTER TABLE stripe_orders ADD COLUMN shipping_address_line1 TEXT;
  END IF;

  -- Add shipping_address_line2 column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'shipping_address_line2'
  ) THEN
    ALTER TABLE stripe_orders ADD COLUMN shipping_address_line2 TEXT;
  END IF;

  -- Add shipping_address_city column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'shipping_address_city'
  ) THEN
    ALTER TABLE stripe_orders ADD COLUMN shipping_address_city TEXT;
  END IF;

  -- Add shipping_address_state column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'shipping_address_state'
  ) THEN
    ALTER TABLE stripe_orders ADD COLUMN shipping_address_state TEXT;
  END IF;

  -- Add shipping_address_postal_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'shipping_address_postal_code'
  ) THEN
    ALTER TABLE stripe_orders ADD COLUMN shipping_address_postal_code TEXT;
  END IF;

  -- Add shipping_address_country column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'shipping_address_country'
  ) THEN
    ALTER TABLE stripe_orders ADD COLUMN shipping_address_country TEXT;
  END IF;

  -- Add delivery_instructions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'delivery_instructions'
  ) THEN
    ALTER TABLE stripe_orders ADD COLUMN delivery_instructions TEXT;
  END IF;
END $$;