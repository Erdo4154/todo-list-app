import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Category, Todo, TodoRow } from '../types'

interface TodoListProps {
  session: Session
}

const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function TodoList({ session }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [newTask, setNewTask] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [activeFilter, setActiveFilter] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const userId = session.user.id

  // Realtime payload'i sadece ham satırı taşır: category_id vardır, categories yoktur.
  // Bağlı kategoriyi çözebilmek için güncel listeyi ref'te tutuyoruz -- böylece
  // kategori eklendiğinde aboneliği baştan kurmak zorunda kalmıyoruz.
  const categoriesRef = useRef<Category[]>([])
  useEffect(() => {
    categoriesRef.current = categories
  }, [categories])

  useEffect(() => {
    let isMounted = true

    function attachCategory(row: TodoRow): Todo {
      const match = categoriesRef.current.find((category) => category.id === row.category_id)
      return {
        ...row,
        categories: match ? { id: match.id, name: match.name, color: match.color } : null,
      }
    }

    async function fetchAll() {
      const [categoryResult, todoResult] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        // Gömülü kaynak: tek istekte hem görevler hem bağlı kategori geliyor.
        // PostgREST foreign key'i görüp join'i kendisi kuruyor.
        supabase.from('todos').select('*, categories(id, name, color)').order('inserted_at'),
      ])

      if (!isMounted) return

      const fetchError = categoryResult.error ?? todoResult.error
      if (fetchError) {
        setError(fetchError.message)
      } else {
        const loadedCategories = categoryResult.data ?? []
        categoriesRef.current = loadedCategories
        setCategories(loadedCategories)
        setTodos((todoResult.data as Todo[] | null) ?? [])
      }
      setLoading(false)
    }

    fetchAll()

    // Realtime: Postgres'teki her insert/update/delete supabase üzerinden anında buraya düşüyor,
    // böylece sayfayı yenilemeden veya polling yapmadan liste güncel kalır.
    // Tek kanal üzerinden iki tabloyu birden dinliyoruz.
    const channel = supabase
      .channel('todos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = attachCategory(payload.new as TodoRow)
            setTodos((current) =>
              current.some((todo) => todo.id === inserted.id) ? current : [...current, inserted],
            )
          }
          if (payload.eventType === 'UPDATE') {
            const updated = attachCategory(payload.new as TodoRow)
            setTodos((current) => current.map((todo) => (todo.id === updated.id ? updated : todo)))
          }
          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as TodoRow
            setTodos((current) => current.filter((todo) => todo.id !== deleted.id))
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Category
            setCategories((current) =>
              current.some((category) => category.id === inserted.id)
                ? current
                : [...current, inserted].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
            )
          }
          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as Category
            setCategories((current) => current.filter((category) => category.id !== deleted.id))
          }
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function addCategory(event: FormEvent) {
    event.preventDefault()
    const name = newCategory.trim()
    if (!name) return

    const color = PALETTE[categories.length % PALETTE.length]
    const { error: insertError } = await supabase
      .from('categories')
      .insert({ name, color, user_id: userId })

    if (insertError) {
      setError(insertError.message)
    } else {
      setNewCategory('')
      setError(null)
    }
  }

  async function addTodo(event: FormEvent) {
    event.preventDefault()
    const task = newTask.trim()
    if (!task) return

    const { error: insertError } = await supabase.from('todos').insert({
      task,
      user_id: userId,
      category_id: newTaskCategory ? Number(newTaskCategory) : null,
    })

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

  if (loading) return <p className="loading-screen">Yükleniyor...</p>

  const visibleTodos =
    activeFilter === 'all' ? todos : todos.filter((todo) => todo.category_id === activeFilter)

  return (
    <div className="todo-card">
      <header className="todo-header">
        <h1>Yapılacaklar</h1>
        <button type="button" className="link-button" onClick={() => supabase.auth.signOut()}>
          Çıkış yap
        </button>
      </header>

      <form onSubmit={addCategory} className="add-category">
        <input
          type="text"
          placeholder="Yeni kategori..."
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
        />
        <button type="submit" className="secondary-button">
          Kategori ekle
        </button>
      </form>

      {categories.length > 0 && (
        <div className="filter-bar">
          <button
            type="button"
            className={activeFilter === 'all' ? 'filter-chip active' : 'filter-chip'}
            onClick={() => setActiveFilter('all')}
          >
            Tümü
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={activeFilter === category.id ? 'filter-chip active' : 'filter-chip'}
              style={
                activeFilter === category.id
                  ? { backgroundColor: category.color, borderColor: category.color }
                  : { borderColor: category.color, color: category.color }
              }
              onClick={() => setActiveFilter(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={addTodo} className="add-todo">
        <input
          type="text"
          placeholder="Yeni görev ekle..."
          value={newTask}
          onChange={(event) => setNewTask(event.target.value)}
        />
        <select
          value={newTaskCategory}
          onChange={(event) => setNewTaskCategory(event.target.value)}
          aria-label="Kategori"
        >
          <option value="">Kategorisiz</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button type="submit">Ekle</button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul className="todo-list">
        {visibleTodos.length === 0 && (
          <li className="empty">{todos.length === 0 ? 'Henüz görev yok.' : 'Bu kategoride görev yok.'}</li>
        )}
        {visibleTodos.map((todo) => (
          <li key={todo.id} className={todo.is_complete ? 'done' : ''}>
            <label>
              <input type="checkbox" checked={todo.is_complete} onChange={() => toggleTodo(todo)} />
              <span>{todo.task}</span>
              {todo.categories && (
                <span
                  className="category-badge"
                  style={{ backgroundColor: todo.categories.color }}
                >
                  {todo.categories.name}
                </span>
              )}
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
