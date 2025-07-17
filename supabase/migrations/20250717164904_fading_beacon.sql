/*
  # Add line items to stripe orders

  1. Schema Changes
    - Add `line_items` column to `stripe_orders` table to store purchased product details
    - Column type: jsonb to store array of product objects
    - Each line item will contain: product_id, name, description, unit_amount, quantity, currency, image_url

  2. Security
    - No RLS changes needed as existing policies cover the new column
    - Column is nullable to support existing orders without line items

  3. Data Structure
    The line_items column will store an array of objects like:
    [
      {
        "product_id": "prod_123",
        "name": "Vitamin C Serum",
        "description": "Powerful antioxidant serum",
        "unit_amount": 50,
        "quantity": 2,
        "currency": "eur",
        "image_url": "https://example.com/image.jpg"
      }
    ]
*/

-- Add line_items column to store purchased product details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'line_items'
  ) THEN
    ALTER TABLE stripe_orders ADD COLUMN line_items jsonb;
  END IF;
END $$;