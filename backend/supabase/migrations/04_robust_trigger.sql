-- Robust Trigger for New User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- We use COALESCE and CASE to ensure we always get a valid full_name and role
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name', 
      'Admin User' -- Fallback name
    ), 
    CASE 
      WHEN (new.raw_user_meta_data->>'role') = 'admin' THEN 'admin'::user_role
      WHEN (new.raw_user_meta_data->>'role') = 'manager' THEN 'manager'::user_role
      WHEN (new.raw_user_meta_data->>'role') = 'president' THEN 'admin'::user_role
      ELSE 'employee'::user_role
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-sync existing profiles just in case
UPDATE public.profiles p
SET 
  role = CASE 
    WHEN u.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::user_role
    WHEN u.raw_user_meta_data->>'role' = 'manager' THEN 'manager'::user_role
    WHEN u.raw_user_meta_data->>'role' = 'president' THEN 'admin'::user_role
    ELSE p.role
  END,
  full_name = COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Admin User')
FROM auth.users u
WHERE p.id = u.id AND (p.full_name = 'Unknown User' OR p.role = 'employee');
