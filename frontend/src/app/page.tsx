'use client' // Must be at the very top

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// 1. Client initialization
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    setHasMounted(true)
    // Put your data fetching here
    const fetchTasks = async () => {
      const { data } = await supabase.from('tasks').select('*')
      setTasks(data || [])
    }
    fetchTasks()
  }, [])

  // 2. This is the crucial part to stop Error #418
  if (!hasMounted) {
    return <div style={{ opacity: 0 }}>Loading...</div> 
  }

  return (
    <main>
      <h1>Task Manager</h1>
      {tasks.map(t => <p key={t.id}>{t.title}</p>)}
    </main>
  )
}