/*
  # Fix user signup trigger

  1. Database Functions
    - Ensure handle_new_user function exists and works correctly
    - Function creates profile entry when new user signs up

  2. Database Triggers
    - Create trigger on auth.users table
    - Automatically calls handle_new_user when user is created

  3. Security
    - Function runs with security definer privileges
    - Ensures proper access to auth schema
*/

-- Recreate the handle_new_user function to ensure it works correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user'::user_role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();