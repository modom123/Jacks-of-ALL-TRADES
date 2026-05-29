# Supabase Setup

## Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- A Supabase project created at https://supabase.com

## Setup Steps

1. **Login to Supabase CLI:**
   ```bash
   supabase login
   ```

2. **Link your project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Run migrations:**
   ```bash
   supabase db push
   ```
   Or manually run `migrations/001_initial.sql` in the Supabase SQL editor.

4. **Apply RLS policies:**
   Run `rls.sql` in the Supabase SQL editor.

5. **Seed sample data:**
   Run `seed.sql` in the Supabase SQL editor.

6. **Get your keys:**
   - Go to Project Settings → API
   - Copy `Project URL` → `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → `SUPABASE_SERVICE_KEY` (keep secret, server-side only)

## Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Extends auth.users with role and trade info |
| `applications` | Apprenticeship applications |
| `contacts` | Contact form submissions |
| `donations` | Financial and in-kind donations |
| `products` | Shop items (candy, popcorn, raffle, merch) |
| `orders` | Shop orders |
| `order_items` | Line items for orders |
| `students` | Enrolled students with mentor assignments |
| `volunteers` | Volunteer sign-ups |

## Roles
- `student` — enrolled apprentice
- `mentor` — trade mentor / instructor
- `admin` — staff with full access
- `donor` — donor / supporter
