'use client'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState, FormEvent } from 'react'

// 1. Define the Task interface so TS knows what a 'task' object contains
interface Task {
  id: number;
  title: string;
  created_at?: string;
}

// 2. Use the '!' non-null assertion to tell TS these variables definitely exist
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  // 3. Tell useState this is an array of Tasks, not an array of 'never'
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState<string>('')

  async function getTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Fetch Error:', error.message)
    } else {
      // 4. Cast data to Task[] to satisfy the state type
      setTasks((data as Task[]) || [])
    }
  }

  useEffect(() => {
    getTasks()
  }, [])

  // 5. Type the event 'e' as FormEvent to fix the 'implicit any' error
  async function addTask(e: FormEvent) {
    e.preventDefault()
    if (!newTask) return

    const { error } = await supabase
      .from('tasks')
      .insert([{ title: newTask }])

    if (error) {
      alert(`Error: ${error.message}`) 
    } else {
      setNewTask('')
      getTasks() 
    }
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>My Tasks</h1>
      
      <form onSubmit={addTask} style={{ marginBottom: '2rem' }}>
        <input 
          type="text" 
          value={newTask} 
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit">Add Task</button>
      </form>

      <div id="tasks-container">
        {tasks.length === 0 ? <p>No tasks found.</p> : (
          tasks.map(task => (
            <p key={task.id} style={{ borderBottom: '1px solid #ccc', padding: '0.5rem 0' }}>
              {task.title}
            </p>
          ))
        )}
      </div>
    </main>
  )
}