# Supabase Todo App (React + TypeScript + Vite)

Supabase'i pratik yaparak ogrenmek icin kucuk bir todo list uygulamasi.
Email/parola ile giris, kullaniciya ozel gorevler, RLS (Row Level Security)
ve realtime senkronizasyon iceriyor.

## 1. Supabase projesi olustur

1. https://supabase.com adresinde ucretsiz bir hesap ac ve yeni bir proje olustur.
2. Proje acildiktan sonra sol menuden **SQL Editor**'e git, `supabase/schema.sql`
   dosyasinin icerigini yapistir ve calistir. Bu, `todos` tablosunu ve
   kullanicilarin sadece kendi verisini gorup degistirebilmesini saglayan
   RLS politikalarini olusturur.
3. **Project Settings > API** sayfasindan `Project URL` ve `anon public` key
   degerlerini kopyala.

## 2. Ortam degiskenlerini ayarla

```bash
cp .env.example .env
```

`.env` dosyasini acip Supabase'ten kopyaladigin degerlerle doldur:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Calistir

```bash
npm install
npm run dev
```

Tarayicida acilan adreste once bir hesap olustur (Kayit ol), sonra giris yap.

## Kod ile hangi Supabase kavramini ogreniyorsun?

| Kavram | Nerede | Ne yapiyor |
| --- | --- | --- |
| Auth (sign up / sign in / sign out) | `src/components/Auth.tsx`, `src/components/TodoList.tsx` | `supabase.auth.signUp`, `signInWithPassword`, `signOut` |
| Oturum takibi | `src/App.tsx` | `supabase.auth.getSession()` ve `onAuthStateChange` ile oturumu dinleme |
| CRUD (Create/Read/Update/Delete) | `src/components/TodoList.tsx` | `.select()`, `.insert()`, `.update()`, `.delete()` |
| Row Level Security | `supabase/schema.sql` | Her kullanicinin sadece `user_id`'si kendine ait satirlari gorebilmesi |
| Realtime | `src/components/TodoList.tsx` (`supabase.channel(...)`) | Veritabanindaki degisiklikleri sayfa yenilenmeden dinleme |

## Sonraki adimlar (kendi basina denemek icin)

- Gorevlere son tarih (`due_date`) ekleyip tamamlanma yuzdesini goster.
- Google/GitHub ile OAuth girisi ekle (`supabase.auth.signInWithOAuth`).
- Supabase Storage ile gorevlere dosya/fotograf ekleme ozelligi ekle.
- `todos` tablosuna kategori ekleyip filtreleme yap.

## Kaynaklar

- [Supabase resmi dokumantasyon](https://supabase.com/docs)
- [freeCodeCamp: How to Build a TodoApp using ReactJS and Supabase](https://www.freecodecamp.org/news/how-to-build-a-todoapp-using-react-and-supabase)
- [Toptal: The Complete Tutorial to Building a CRUD App With React.js and Supabase](https://www.toptal.com/external-blogs/adeva/building-crud-app-with-react-js-supabase)
- [awesome-supabase-react (GitHub)](https://github.com/ArmenSl/awesome-supabase-react)
