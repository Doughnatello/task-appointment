-- EMERGENCY PERMISSIONS RESET
-- Run this in your Supabase SQL Editor to resolve the 403 Forbidden error

-- 1. HEAL MISSING PROFILES (Ensure every auth user has a profile)
INSERT INTO public.profiles (id, full_name, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', 'Admin User'), 
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' THEN 'admin'::user_role
    WHEN raw_user_meta_data->>'role' = 'president' THEN 'admin'::user_role
    WHEN raw_user_meta_data->>'role' = 'manager' THEN 'manager'::user_role
    ELSE 'employee'::user_role
  END
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE 
SET role = EXCLUDED.role, full_name = EXCLUDED.full_name;

-- 2. CLEAR ALL PREVIOUS POLICIES on TASKS
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'tasks' AND schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', pol.policyname);
    END LOOP;
END $$;

-- 3. APPLY CLEAN POLICIES
-- Allow anyone to view tasks (Simplified for internal app)
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT USING (true);

-- Allow Managers and Admins to INSERT tasks
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  )
);

-- Allow Managers and Admins to UPDATE any task, and Employees to update their assigned tasks
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  ) OR (auth.uid() = employee_id)
);

-- Allow Managers and Admins to DELETE tasks
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  )
);

-- 4. ENSURE RLS IS ON
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
