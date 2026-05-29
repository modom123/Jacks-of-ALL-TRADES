# Jacks of All Trades — Full-Stack Project

Detroit nonprofit apprenticeship and mentoring program. Built with Next.js, Express, Expo React Native, and Supabase.

**Detroit Lions Color Scheme:** Blue `#0076B6` · Silver `#B0B7BC` · Black `#080C10`

---

## Project Structure

```
├── web/           Next.js 14 app (deploy to Vercel)
├── api/           Express.js REST API (deploy to Render)
├── mobile/        Expo React Native (iOS + Android)
└── supabase/      DB migrations, seed data, RLS policies
```

---

## 1. Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations:
   ```sql
   -- In Supabase SQL Editor, run in order:
   -- supabase/migrations/001_initial.sql
   -- supabase/rls.sql
   -- supabase/seed.sql
   ```
3. Note your **Project URL** and **Anon Key** (Settings → API)
4. Note your **Service Role Key** (Settings → API → Service role)

---

## 2. API Server (`/api/`)

### Local development

```bash
cd api
cp .env.example .env
# Fill in your values
npm install
npm run dev
```

### Environment variables (`.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default 3001) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RESEND_API_KEY` | Resend.com API key for emails |
| `ADMIN_EMAIL` | Email to receive admin alerts |
| `FRONTEND_URL` | Frontend URL for Stripe redirect |

### Deploy to Render

1. Push to GitHub
2. Create a new Web Service on [render.com](https://render.com)
3. Connect your repo, set root directory to `api/`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add all environment variables in Render dashboard
7. Set up Stripe webhook: point to `https://your-render-url.onrender.com/api/donations/webhook`

---

## 3. Web App (`/web/`)

### Local development

```bash
cd web
cp .env.example .env.local
# Fill in your values
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment variables (`.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | URL of deployed API (Render) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### Deploy to Vercel

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Set root directory to `web/`
4. Add environment variables in Vercel dashboard
5. Deploy

---

## 4. Mobile App (`/mobile/`)

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (for development)

### Local development

```bash
cd mobile
cp .env.example .env
# Fill in your values
npm install
npm start
```

Scan the QR code with Expo Go to run on your phone.

### Environment variables

Create a `.env` file in `mobile/`:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_API_URL=https://your-render-url.onrender.com
```

### Build for app stores

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Configure
eas build:configure

# Build iOS (requires Apple Developer account)
eas build --platform ios

# Build Android
eas build --platform android
```

---

## 5. Admin Access

1. Create a Supabase user in Authentication → Users
2. In SQL Editor, update their profile role:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = 'your-user-uuid';
   ```
3. Log in at `/admin/login` on the web app or `/(auth)/login` on mobile

---

## 6. Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your keys from Dashboard → Developers → API Keys
3. Set up webhooks:
   - Donation webhook: `POST /api/donations/webhook`
   - Shop webhook: `POST /api/shop/webhook`
   - Events to listen: `checkout.session.completed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## 7. Email Setup (Resend)

1. Create account at [resend.com](https://resend.com)
2. Add your domain and verify DNS records
3. Create an API key
4. Set `RESEND_API_KEY` and update `FROM_EMAIL` in `api/src/lib/email.js`

---

## Pages & Routes

### Web (`/web/`)

| Route | Description |
|---|---|
| `/` | Homepage with all sections |
| `/apply` | Apprenticeship application form |
| `/donate` | Donation page with Stripe |
| `/shop` | Product shop with cart |
| `/volunteer` | Volunteer sign-up |
| `/success` | Post-payment success page |
| `/admin` | Admin dashboard (protected) |
| `/admin/applications` | Manage applications |
| `/admin/contacts` | View messages |
| `/admin/donations` | View donations |
| `/admin/volunteers` | View volunteers |

### API (`/api/`)

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/api/applications` | POST | Submit application |
| `/api/contacts` | POST | Submit contact message |
| `/api/volunteers` | POST | Submit volunteer form |
| `/api/donations/checkout` | POST | Create Stripe checkout |
| `/api/donations/webhook` | POST | Stripe webhook |
| `/api/shop/products` | GET | List active products |
| `/api/shop/checkout` | POST | Create shop checkout |
| `/api/shop/webhook` | POST | Shop Stripe webhook |
| `/api/admin/stats` | GET | Dashboard stats |
| `/api/admin/applications` | GET | List applications |
| `/api/admin/applications/:id` | PATCH | Update application status |
| `/api/admin/contacts` | GET | List contacts |
| `/api/admin/donations` | GET | List donations |
| `/api/admin/volunteers` | GET | List volunteers |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| Mobile | Expo 50, React Native 0.73, Expo Router |
| API | Express.js, Node.js |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Stripe Checkout |
| Email | Resend |
| Web hosting | Vercel |
| API hosting | Render |
| Mobile distribution | Expo EAS Build |
