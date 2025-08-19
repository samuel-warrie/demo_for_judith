/*
  # Fix user creation and admin authentication

  1. Database Setup
    - Drop and recreate handle_new_user function with proper error handling
    - Ensure trigger is properly attached to auth.users
    - Add proper logging for debugging

  2. Security
    - Maintain RLS policies
    - Ensure proper permissions for trigger function

  3. Admin Role Assignment
    - Automatically assign admin role when email contains 'admin'
    - Create profile entry for all new users
*/

-- Drop existing trigger and function to recreate them properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the trigger function with proper error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Log the trigger execution
  RAISE LOG 'handle_new_user triggered for user: %', NEW.id;
  
  -- Determine role based on email
  IF NEW.email ILIKE '%admin%' THEN
    user_role_value := 'admin';
    RAISE LOG 'Assigning admin role to user: %', NEW.email;
  ELSE
    user_role_value := 'user';
    RAISE LOG 'Assigning user role to user: %', NEW.email;
  END IF;

  -- Insert into profiles table
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      role,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      user_role_value,
      NOW(),
      NOW()
    );
    
    RAISE LOG 'Successfully created profile for user: %', NEW.email;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error creating profile for user %: %', NEW.email, SQLERRM;
    -- Re-raise the exception to fail the user creation if profile creation fails
    RAISE;
  END;

  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;