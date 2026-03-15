-- Update handle_new_user function to include token
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, token)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New Operative'), 
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'employee'::user_role),
    new.raw_user_meta_data->>'token'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
