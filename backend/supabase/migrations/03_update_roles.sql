-- 1. Ensure 'admin' is in the user_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON e.enumtypid = t.oid 
    WHERE t.typname = 'user_role' AND e.enumlabel = 'admin'
  ) THEN
    -- Try to rename 'president' to 'admin' if it exists
    IF EXISTS (
      SELECT 1 FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid 
      WHERE t.typname = 'user_role' AND e.enumlabel = 'president'
    ) THEN
      ALTER TYPE public.user_role RENAME VALUE 'president' TO 'admin';
    ELSE
      -- Fallback: just add admin
      ALTER TYPE public.user_role ADD VALUE 'admin';
    END IF;
  END IF;
END $$;

-- 2. Update and fix policies
DROP POLICY IF EXISTS "Users can view tasks they are part of" ON public.tasks;
CREATE POLICY "Users can view tasks they are part of"
ON public.tasks FOR SELECT USING (
  auth.uid() = requester_id OR 
  auth.uid() = employee_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  )
);

DROP POLICY IF EXISTS "Managers and Presidents can create/update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers and Admins can create/update tasks" ON public.tasks;
CREATE POLICY "Managers and Admins can create/update tasks"
ON public.tasks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  )
);

-- 3. HEAL MISSING PROFILES
-- If any users were created but their profile insertion failed, this inserts them now!
INSERT INTO public.profiles (id, full_name, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', 'Unknown User'), 
  -- Safely cast role to user_role
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' THEN 'admin'::user_role
    WHEN raw_user_meta_data->>'role' = 'manager' THEN 'manager'::user_role
    ELSE 'employee'::user_role
  END
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);