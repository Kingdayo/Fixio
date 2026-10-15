import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://c--4a55d2c2-1d95-497d-a101-bd54726455dd-prod.lovable.cloud";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_C3Gb6ixPJvx63f9uh6iaTg_XfVbq5NX";

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      const SecureStore = await import("expo-secure-store");
      return await SecureStore.getItemAsync(key);
    } catch {
      if (typeof localStorage !== "undefined") return localStorage.getItem(key);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      const SecureStore = await import("expo-secure-store");
      await SecureStore.setItemAsync(key, value);
    } catch {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    try {
      const SecureStore = await import("expo-secure-store");
      await SecureStore.deleteItemAsync(key);
    } catch {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
