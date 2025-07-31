/*
  # Create products table with multilingual support

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text, product name)
      - `price` (numeric, current price)
      - `original_price` (numeric, nullable, original price for sales)
      - `image_url` (text, product image URL)
      - `category` (text, product category)
      - `rating` (numeric, product rating)
      - `review_count` (integer, number of reviews)
      - `descriptions` (jsonb, multilingual descriptions)
      - `stock_quantity` (integer, current stock)
      - `low_stock_threshold` (integer, threshold for low stock warning)
      - `stripe_product_id` (text, nullable, Stripe product ID)
      - `stripe_price_id` (text, nullable, Stripe price ID)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `products` table
    - Add policy for public read access
    - Add policy for authenticated users to update stock (for webhook)

  3. Sample Data
    - Insert sample products with multilingual descriptions
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  original_price numeric CHECK (original_price >= 0),
  image_url text NOT NULL,
  category text NOT NULL,
  rating numeric NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  descriptions jsonb NOT NULL DEFAULT '{}',
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  stripe_product_id text,
  stripe_price_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products
CREATE POLICY "Products are publicly readable"
  ON products
  FOR SELECT
  TO public
  USING (true);

-- Allow service role to update stock (for webhook)
CREATE POLICY "Service role can update products"
  ON products
  FOR UPDATE
  TO service_role
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample products
INSERT INTO products (
  name, 
  price, 
  original_price,
  image_url, 
  category, 
  rating, 
  review_count, 
  descriptions,
  stock_quantity, 
  low_stock_threshold,
  stripe_product_id,
  stripe_price_id
) VALUES 
(
  'Vitamin C Brightening Serum',
  0.50,
  NULL,
  'https://images.pexels.com/photos/8617634/pexels-photo-8617634.jpeg?auto=compress&cs=tinysrgb&w=500',
  'skincare',
  4.8,
  324,
  '{
    "en": "Powerful antioxidant serum that brightens and evens skin tone with vitamin C and natural extracts. Perfect for daily use to achieve a radiant, healthy glow.",
    "fi": "Tehokas antioksidanttiseerumi, joka kirkastaa ja tasaa ihon sävyä C-vitamiinin ja luonnollisten uutteiden avulla. Täydellinen päivittäiseen käyttöön säteilevän, terveen hehkun saavuttamiseksi.",
    "sv": "Kraftfullt antioxidantserum som ljusar upp och jämnar ut hudtonen med C-vitamin och naturliga extrakt. Perfekt för daglig användning för att uppnå en strålande, hälsosam glöd."
  }',
  15,
  5,
  'prod_ShDmQ81Ch6zEFT',
  'price_1RlpKxRgarWvqwqjQZeVurVk'
),
(
  'Hydrating Face Moisturizer',
  0.50,
  NULL,
  'https://images.pexels.com/photos/3685538/pexels-photo-3685538.jpeg?auto=compress&cs=tinysrgb&w=500',
  'skincare',
  4.6,
  198,
  '{
    "en": "24-hour hydration with hyaluronic acid and ceramides. Lightweight formula that absorbs quickly without leaving a greasy residue.",
    "fi": "24 tunnin kosteutus hyaluronihapolla ja keramideilla. Kevyt koostumus, joka imeytyy nopeasti jättämättä rasvaista jäännöstä.",
    "sv": "24-timmars återfuktning med hyaluronsyra och ceramider. Lätt formula som absorberas snabbt utan att lämna en fet rückstand."
  }',
  3,
  5,
  'prod_ShDkXYoMbMuExj',
  'price_1RlpJ0RgarWvqwqjUV6fjFyi'
),
(
  'Matte Liquid Lipstick Set',
  0.50,
  NULL,
  'https://images.pexels.com/photos/2113855/pexels-photo-2113855.jpeg?auto=compress&cs=tinysrgb&w=500',
  'makeup',
  4.7,
  267,
  '{
    "en": "Long-lasting matte finish in 3 trending shades. Comfortable wear that does not dry out lips. Includes nude, berry, and classic red shades.",
    "fi": "Pitkäkestoinen mattapinta 3 trendikkäässä sävyssä. Mukava käyttää, ei kuivata huulia. Sisältää nude-, marja- ja klassisen punaisen sävyn.",
    "sv": "Långvarig matt finish i 3 trendiga nyanser. Bekväm att bära som inte torkar ut läpparna. Inkluderar nude, bär och klassisk röd nyans."
  }',
  25,
  10,
  'prod_ShDjtqgHABMCLR',
  'price_1RlpHlRgarWvqwqj6YCIhYXw'
),
(
  'Gentle Cleansing Oil',
  0.50,
  NULL,
  'https://images.pexels.com/photos/3685538/pexels-photo-3685538.jpeg?auto=compress&cs=tinysrgb&w=500',
  'skincare',
  4.9,
  412,
  '{
    "en": "Removes makeup and impurities without stripping skin of natural oils. Suitable for all skin types including sensitive skin.",
    "fi": "Poistaa meikin ja epäpuhtaudet kuivattamatta ihoa luonnollisista öljyistä. Sopii kaikille ihotyypeille, myös herkälle iholle.",
    "sv": "Tar bort smink och orenheter utan att torka ut huden från naturliga oljor. Lämplig för alla hudtyper inklusive känslig hud."
  }',
  0,
  5,
  'prod_ShDhENJOOa5LDZ',
  'price_1RlpFzRgarWvqwqjsE2hZmtB'
),
(
  'Eyeshadow Palette',
  0.50,
  NULL,
  'https://images.pexels.com/photos/2113855/pexels-photo-2113855.jpeg?auto=compress&cs=tinysrgb&w=500',
  'makeup',
  4.5,
  189,
  '{
    "en": "12 versatile shades from neutral to bold. Highly pigmented colors with excellent blendability. Perfect for creating day and night looks.",
    "fi": "12 monipuolista sävyä neutraaleista rohkeisiin. Erittäin pigmentoidut värit erinomaisella sekoitettavuudella. Täydellinen päivä- ja iltameikkeihin.",
    "sv": "12 mångsidiga nyanser från neutrala till djärva. Mycket pigmenterade färger med utmärkt blandbarhet. Perfekt för att skapa dag- och kvällslooks."
  }',
  8,
  10,
  'prod_ShDfIKMfG8QOad',
  'price_1RlpDoRgarWvqwqjidfY0qEI'
);