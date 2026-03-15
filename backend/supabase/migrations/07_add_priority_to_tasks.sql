-- Migration to add priority to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

-- Add check constraint to ensure valid priority values
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'tasks_priority_check'
    ) THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
    END IF;
END $$;
