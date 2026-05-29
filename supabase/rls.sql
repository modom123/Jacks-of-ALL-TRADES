alter table applications enable row level security;
alter table contacts enable row level security;
alter table donations enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table volunteers enable row level security;

-- Public can insert applications, contacts, volunteers
create policy "Public can submit applications" on applications for insert with check (true);
create policy "Public can submit contacts" on contacts for insert with check (true);
create policy "Public can submit volunteers" on volunteers for insert with check (true);

-- Admins can see everything
create policy "Admins can read applications" on applications for select using (auth.jwt() ->> 'role' = 'admin');
create policy "Admins can update applications" on applications for update using (auth.jwt() ->> 'role' = 'admin');
create policy "Admins can read contacts" on contacts for select using (auth.jwt() ->> 'role' = 'admin');
create policy "Admins can read donations" on donations for select using (auth.jwt() ->> 'role' = 'admin');
create policy "Admins can read volunteers" on volunteers for select using (auth.jwt() ->> 'role' = 'admin');

-- Products are public readable
create policy "Products are public" on products for select using (active = true);

-- Orders: user sees their own, admins see all
create policy "Users see own orders" on orders for select using (customer_email = auth.jwt() ->> 'email');
