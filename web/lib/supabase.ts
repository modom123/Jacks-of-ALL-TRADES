import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'student' | 'mentor' | 'admin' | 'donor';
  trade_interest: string | null;
  created_at: string;
};

export type Application = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  trade_interest: string | null;
  background: string | null;
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected';
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  category: 'candy' | 'popcorn' | 'raffle' | 'merchandise';
  stripe_price_id: string | null;
  stock: number;
  active: boolean;
  image_emoji: string | null;
  created_at: string;
};
