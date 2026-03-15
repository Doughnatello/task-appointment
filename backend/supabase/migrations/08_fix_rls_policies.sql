-- Fix RLS policies for Task Creation
-- The previous "FOR ALL" policy might not have been correctly allowing INSERTs in some scenarios
-- We ensure explicit INSERT and UPDATE policies with WITH CHECK clauses.

DROP POLICY IF EXISTS "Managers and Admins can create/update tasks" ON public.tasks;

-- Policy for viewing tasks (SELECT)
CREATE POLICY "Allow view tasks"
ON public.tasks FOR SELECT
USING (
  auth.uid() = requester_id OR 
  auth.uid() = employee_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  )
);

-- Policy for creating tasks (INSERT)
CREATE POLICY "Allow create tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  )
);

-- Policy for updating tasks (UPDATE)
CREATE POLICY "Allow update tasks"
ON public.tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  ) OR auth.uid() = employee_id -- Employees can update their own tasks (status)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  ) OR (
    auth.uid() = employee_id AND 
    -- Only allow employees to change status/metadata, not other fields
    -- This is a bit complex for a simple RLS, so we rely on app logic for now
    -- but allow the update to pass RLS.
    true
  )
);

-- Policy for deleting tasks (DELETE)
CREATE POLICY "Allow delete tasks"
ON public.tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  )
);
