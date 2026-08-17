export interface Category {
  id: number
  user_id: string
  name: string
  color: string
  inserted_at: string
}

/** `todos` tablosundaki ham satır -- realtime payload'i tam olarak bunu taşır. */
export interface TodoRow {
  id: number
  user_id: string
  task: string
  is_complete: boolean
  inserted_at: string
  category_id: number | null
}

/** Ham satır + bağlı kategori. `.select('*, categories(...)')` bunu döndürür. */
export interface Todo extends TodoRow {
  categories: Pick<Category, 'id' | 'name' | 'color'> | null
}
