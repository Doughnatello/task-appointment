-- Update the position for all Admins to be 'Admin'
UPDATE public.profiles 
SET position = 'Admin' 
WHERE role = 'admin' AND (position IS NULL OR position = '' OR position = 'Operator');

-- Also Update the trigger fallback for better identity
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, position)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name', 
      'Admin User'
    ), 
    CASE 
      WHEN (new.raw_user_meta_data->>'role') = 'admin' THEN 'admin'::user_role
      WHEN (new.raw_user_meta_data->>'role') = 'manager' THEN 'manager'::user_role
      WHEN (new.raw_user_meta_data->>'role') = 'president' THEN 'admin'::user_role
      ELSE 'employee'::user_role
    END,
    CASE
      WHEN (new.raw_user_meta_data->>'role') IN ('admin', 'president') THEN 'Admin'
      WHEN (new.raw_user_meta_data->>'role') = 'manager' THEN 'Manager'
      ELSE COALESCE(new.raw_user_meta_data->>'position', 'Operative')
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
