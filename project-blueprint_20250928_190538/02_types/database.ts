// Generated TypeScript types for Supabase
// Note: This is a placeholder. Use 'supabase gen types typescript' to generate actual types

export interface Database {
  public: {
    Tables: Record<string, unknown>; // Add your table types here
    Views: Record<string, unknown>; // Add your view types here
    Functions: Record<string, unknown>; // Add your function types here
    Enums: Record<string, unknown>; // Add your enum types here
  };
}

// Usage example:
// import { createClient } from '@supabase/supabase-js'
// import type { Database } from './database'
// 
// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// )
