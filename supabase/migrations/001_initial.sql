-- Users / profiles (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  phone text,
  role text check (role in ('student','mentor','admin','donor')) default 'donor',
  trade_interest text,
  created_at timestamptz default now()
);

-- Applications
create table applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  trade_interest text,
  background text,
  status text check (status in ('pending','reviewing','accepted','rejected')) default 'pending',
  created_at timestamptz default now()
);

-- Contact messages
create table contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  subject text,
  message text,
  type text check (type in ('general','volunteer','donate','mentor')) default 'general',
  status text default 'unread',
  created_at timestamptz default now()
);

-- Donations
create table donations (
  id uuid primary key default gen_random_uuid(),
  donor_name text,
  donor_email text,
  amount_cents integer not null,
  type text check (type in ('financial','property','materials','tools','time')),
  stripe_session_id text,
  status text check (status in ('pending','completed','failed')) default 'pending',
  created_at timestamptz default now()
);

-- Products (shop)
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null,
  category text check (category in ('candy','popcorn','raffle','merchandise')),
  stripe_price_id text,
  stock integer default 999,
  active boolean default true,
  image_emoji text,
  created_at timestamptz default now()
);

-- Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_email text,
  customer_name text,
  stripe_session_id text,
  total_cents integer,
  status text check (status in ('pending','paid','fulfilled','cancelled')) default 'pending',
  created_at timestamptz default now()
);

-- Order items
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders,
  product_id uuid references products,
  quantity integer default 1,
  price_cents integer
);

-- Students (enrolled)
create table students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  application_id uuid references applications,
  trade text,
  mentor_id uuid references profiles,
  enrollment_date date,
  status text check (status in ('active','completed','withdrawn')) default 'active',
  progress_notes text,
  created_at timestamptz default now()
);

-- Volunteer submissions
create table volunteers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  trade_skill text,
  role text,
  status text default 'pending',
  created_at timestamptz default now()
);
