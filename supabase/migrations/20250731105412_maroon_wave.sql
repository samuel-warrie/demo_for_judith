@@ .. @@
-/*
-  # Insert Beauty Products
-
-  1. New Data
-    - Insert 4 beauty products with multilingual descriptions
-    - Each product includes Stripe integration IDs
-    - Stock quantities and thresholds configured
-    - Categories: skincare and makeup
-    - Ratings and review counts included
-
-  2. Products Added
-    - Hydrating Face Moisturizer (skincare)
-    - Matte Liquid Lipstick Set (makeup) 
-    - Gentle Cleansing Oil (skincare)
-    - Eyeshadow Palette (makeup)
-
-  3. Features
-    - Multilingual descriptions (EN, FI, SV)
-    - Stock management with low stock thresholds
-    - Stripe payment integration ready
-    - High-quality Pexels images
-*/
-
 INSERT INTO products (
   name, 
   price, 
-  original_price,
   image_url, 
   category, 
-  rating,
-  review_count,
   descriptions, 
   stock_quantity, 
   low_stock_threshold,
   stripe_product_id,
   stripe_price_id
 ) VALUES 
 (
   'Hydrating Face Moisturizer',
   0.50,
-  NULL,
   'https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg',
   'skincare',
-  4.6,
-  89,
   '{"en": "24-hour hydration with hyaluronic acid and ceramides", "fi": "24 tunnin kosteutus hyaluronihapolla ja keramideilla", "sv": "24-timmars återfuktning med hyaluronsyra och ceramider"}',
   20,
   5,
   'prod_ShDkXYoMbMuExj',
   'price_1RlpJ0RgarWvqwqjUV6fjFyi'
 ),
 (
   'Matte Liquid Lipstick Set',
   0.50,
-  NULL,
   'https://images.pexels.com/photos/2533266/pexels-photo-2533266.jpeg',
   'makeup',
-  4.7,
-  156,
   '{"en": "Long-lasting matte finish in 3 trending shades", "fi": "Pitkäkestoinen mattapinta 3 trendikkäässä sävyssä", "sv": "Långvarig matt finish i 3 trendiga nyanser"}',
   12,
   2,
   'prod_ShDjtqgHABMCLR',
   'price_1RlpHlRgarWvqwqj6YCIhYXw'
 ),
 (
   'Gentle Cleansing Oil',
   0.50,
-  NULL,
   'https://images.pexels.com/photos/4465124/pexels-photo-4465124.jpeg',
   'skincare',
-  4.5,
-  203,
   '{"en": "Removes makeup and impurities without stripping skin", "fi": "Poistaa meikin ja epäpuhtaudet kuivattamatta ihoa", "sv": "Tar bort smink och orenheter utan att torka ut huden"}',
   18,
   4,
   'prod_ShDhENJOOa5LDZ',
   'price_1RlpFzRgarWvqwqjsE2hZmtB'
 ),
 (
   'Eyeshadow Palette',
   0.50,
-  NULL,
   'https://images.pexels.com/photos/2533329/pexels-photo-2533329.jpeg',
   'makeup',
-  4.9,
-  78,
   '{"en": "12 versatile shades from neutral to bold", "fi": "12 monipuolista sävyä neutraaleista rohkeisiin", "sv": "12 mångsidiga nyanser från neutrala till djärva"}',
   8,
   2,
   'prod_ShDfIKMfG8QOad',
   'price_1RlpDoRgarWvqwqjidfY0qEI'
 );