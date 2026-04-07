import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseReady =
  typeof url === 'string' && url.startsWith('http') &&
  typeof key === 'string' && key.length > 10;

export const supabase = supabaseReady
  ? createClient(url, key)
  : null;
