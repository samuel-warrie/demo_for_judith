/*
  # Fix admin user signup trigger

  1. Updates
    - Fix the handle_new_user trigger function to properly create profiles
    - Ensure admin role is assigned when email contains 'admin'
    - Handle any potential conflicts or errors in profile creation

  2. Security
    - Maintains existing RLS policies
    - Ensures proper role assignment based on email
*/

-- Drop and recreate the trigger function to fix any issues
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table with proper role assignment
  INSERT INTO public.profiles (
    id,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email ILIKE '%admin%' THEN 'admin'::user_role
      ELSE 'user'::user_role
    END,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();