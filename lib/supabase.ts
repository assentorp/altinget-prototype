import { createClient, SupabaseClient } from '@supabase/supabase-js';

// You'll need to add these to your .env.local file:
// NEXT_PUBLIC_SUPABASE_URL=your-project-url
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

// Only create client if we have valid, non-empty credentials
let supabaseClient: SupabaseClient | null = null;

if (
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('http')
) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
  }
}

// Export client - will be null if not configured, component checks before use
export const supabase = supabaseClient as SupabaseClient;
