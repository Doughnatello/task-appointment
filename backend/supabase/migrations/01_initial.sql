CREATE TYPE user_role AS ENUM ('manager', 'admin', 'employee');

-- Create enum for task status
CREATE TYPE task_status AS ENUM (
  'backlog',
  'pending_confirmation',
  'in_progress',
  'completed',
  'review',
  'rescheduled',
  'extended'
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'employee',
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  requester_id UUID REFERENCES public.profiles(id),
  employee_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  status task_status DEFAULT 'pending_confirmation',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Tasks Policies
CREATE POLICY "Users can view tasks they are part of"
ON public.tasks FOR SELECT USING (
  auth.uid() = requester_id OR 
  auth.uid() = employee_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  )
);

CREATE POLICY "Managers and Admins can create/update tasks"
ON public.tasks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  )
);

CREATE POLICY "Employees can update their assigned tasks status"
ON public.tasks FOR UPDATE USING (
  auth.uid() = employee_id
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', (new.raw_user_meta_data->>'role')::user_role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users logic
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
