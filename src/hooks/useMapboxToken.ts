import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedToken: string | null = null;

export function useMapboxToken() {
  const [token, setToken] = useState<string>(cachedToken || "");

  useEffect(() => {
    if (cachedToken) return;
    supabase.functions
      .invoke("get-mapbox-token")
      .then(({ data }) => {
        const t = data?.token || "";
        cachedToken = t;
        setToken(t);
      })
      .catch(() => {});
  }, []);

  return token;
}

export async function getMapboxToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  try {
    const { data } = await supabase.functions.invoke("get-mapbox-token");
    cachedToken = data?.token || "";
    return cachedToken;
  } catch {
    return "";
  }
}
