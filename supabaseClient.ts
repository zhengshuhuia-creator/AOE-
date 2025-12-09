
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Helper to get creds from local storage
const CRED_KEY = 'supabase_credentials';

export interface SupabaseCreds {
  url: string;
  key: string;
}

export const getSupabaseCreds = (): SupabaseCreds | null => {
  try {
    const stored = localStorage.getItem(CRED_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

export const saveSupabaseCreds = (creds: SupabaseCreds) => {
  localStorage.setItem(CRED_KEY, JSON.stringify(creds));
};

export const clearSupabaseCreds = () => {
  localStorage.removeItem(CRED_KEY);
};

// Singleton client instance
let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const creds = getSupabaseCreds();
  if (creds && creds.url && creds.key) {
    try {
      supabaseInstance = createClient(creds.url, creds.key);
      return supabaseInstance;
    } catch (e) {
      console.error("Failed to initialize Supabase", e);
      return null;
    }
  }
  return null;
};

// Force re-initialization (e.g. after user enters keys)
export const initSupabase = (url: string, key: string): SupabaseClient => {
  supabaseInstance = createClient(url, key);
  saveSupabaseCreds({ url, key });
  return supabaseInstance;
};
