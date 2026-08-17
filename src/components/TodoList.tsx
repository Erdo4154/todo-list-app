import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Todo } from '../types'

interface TodoListProps {
  session: Session
}

export default function TodoList({ session }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTask, setNewTask] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const userId = session.user.id

  useEffect(() => {
    let isMounted = true

    async function fetchTodos() {
      const { data, error: fetchError } = await supabase
        .from('todos')
        .select('*')
        .order('inserted_at', { ascending: true })

      if (!isMounted) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setTodos(data ?? [])
      }
      setLoading(false)
    }

    fetchTodos()

    // Realtime: Postgres'teki her insert/update/delete supabase uzerinden aninda buraya dusuyor,
    // boylece sayfayi yenilemeden veya polling yapmadan liste guncel kalir.
    const channel = supabase
      .channel('todos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Todo
            setTodos((current) =>
              current.some((todo) => todo.id === inserted.id) ? current : [...current, inserted],
            )
          }
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Todo
            setTodos((current) => current.map((todo) => (todo.id === updated.id ? updated : todo)))
          }
          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as Todo
            setTodos((current) => current.filter((todo) => todo.id !== deleted.id))
          }
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function addTodo(event: FormEvent) {
    event.preventDefault()
    const task = newTask.trim()
    if (!task) return

    const { error: insertError } = await supabase.from('todos').insert({ task, user_id: userId })

    if (insertError) {
      setError(insertError.message)
    } else {
      setNewTask('')
    }
  }

  async function toggleTodo(todo: Todo) {
    const { error: updateError } = await supabase
      .from('todos')
      .update({ is_complete: !todo.is_complete })
      .eq('id', todo.id)

    if (updateError) setError(updateError.message)
  }

  async function deleteTodo(id: number) {
    const { error: deleteError } = await supabase.from('todos').delete().eq('id', id)
    if (deleteError) setError(deleteError.message)
  }

  if (loading) return <p className="loading-screen">Yukleniyor...</p>

  return (
    <div className="todo-card">
      <header className="todo-header">
        <h1>Yapilacaklar</h1>
        <button type="button" className="link-button" onClick={() => supabase.auth.signOut()}>
          Cikis yap
        </button>
      </header>

      <form onSubmit={addTodo} className="add-todo">
        <input
          type="text"
          placeholder="Yeni gorev ekle..."
          value={newTask}
          onChange={(event) => setNewTask(event.target.value)}
        />
        <button type="submit">Ekle</button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul className="todo-list">
        {todos.length === 0 && <li className="empty">Henuz gorev yok.</li>}
        {todos.map((todo) => (
          <li key={todo.id} className={todo.is_complete ? 'done' : ''}>
            <label>
              <input type="checkbox" checked={todo.is_complete} onChange={() => toggleTodo(todo)} />
              <span>{todo.task}</span>
            </label>
            <button type="button" className="delete-button" onClick={() => deleteTodo(todo.id)}>
              Sil
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
