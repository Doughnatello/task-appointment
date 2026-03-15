-- Enable Realtime for tasks and profiles so live updates broadcast to all clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
