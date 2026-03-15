'use client'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState, FormEvent } from 'react'

// 1. Define the Task shape
interface Task {
  id: number;
  title: string;
}

// 2. Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState<string>('')
  const [hasMounted, setHasMounted] = useState(false)

  // 3. Fetch Logic
  async function getTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('id', { ascending: false })
    
    if (!error && data) {
      setTasks(data as Task[])
    }
  }

  useEffect(() => {
    setHasMounted(true)
    getTasks()
  }, [])

  // 4. Add Logic
  async function addTask(e: FormEvent) {
    e.preventDefault()
    if (!newTask) return

    const { error } = await supabase
      .from('tasks')
      .insert([{ title: newTask }])

    if (!error) {
      setNewTask('')
      getTasks()
    } else {
      alert(error.message)
    }
  }

  // PREVENT HYDRATION ERROR #418:
  // We return a simple loading state until the browser is ready.
  if (!hasMounted) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Loading Task Manager...</h1>
      </main>
    )
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>My Tasks</h1>
      
      <form onSubmit={addTask} style={{ marginBottom: '2rem' }}>
        <input 
          type="text" 
          value={newTask} 
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New task..."
          style={{ padding: '8px', marginRight: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 16px' }}>Add Task</button>
      </form>

      <div>
        {tasks.length === 0 ? <p>No tasks yet.</p> : (
          tasks.map(task => (
            <p key={task.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
              {task.title}
            </p>
          ))
        )}
      </div>
    </main>
  )
}