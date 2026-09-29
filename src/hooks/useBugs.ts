import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { BUG_COLUMNS, type Bug } from "@/lib/bug-utils";

export function useBugs(enabled = true) {
  return useQuery({
    queryKey: ["bugs"],
    enabled,
    queryFn: async (): Promise<Bug[]> => {
      const { data, error } = await supabase
        .from("bugs")
        .select(BUG_COLUMNS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Bug[];
    },
  });
}

export function useBug(id: string) {
  return useQuery({
    queryKey: ["bug", id],
    queryFn: async (): Promise<Bug | null> => {
      const { data, error } = await supabase
        .from("bugs")
        .select(BUG_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Bug | null;
    },
  });
}
