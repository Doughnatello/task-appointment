import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    throw new Error('Supabase URL and Anon Key are missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Role = 'manager' | 'employee' | 'admin' | 'president';

export interface Profile {
    id: string;
    full_name: string;
    email?: string;
    role: Role;
    position?: string;
    avatar_url?: string;
    employee_id?: string;
    token?: string;
    updated_at?: string;
}

export type TaskStatus =
    | 'pending_confirmation'
    | 'in_progress'
    | 'completed'
    | 'review'
    | 'rescheduled'
    | 'extended';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
    id: string;
    created_at: string;
    requester_id: string;
    employee_id: string;
    title: string;
    description: string;
    address: string;
    scheduled_at: string;
    end_at: string;
    priority: Priority;
    status: TaskStatus;
    metadata: any;
    employee?: Profile;
    requester?: Profile;
}

