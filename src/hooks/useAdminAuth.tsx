import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

async function ensureProfile(u: User) {
  // properties.host_id tem FK para profiles.id; então garantimos que exista.
  const fullName = (u.email?.split("@")[0] ?? "").slice(0, 80);
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: u.id, full_name: fullName }, { onConflict: "id" });
  if (error) throw error;
}

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (nextSession?.user) {
        // Evita deadlock chamando o backend dentro do callback
        setTimeout(() => {
          ensureProfile(nextSession.user).catch(() => {
            // silencioso: o painel lida com erros no momento de salvar
          });
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);

      if (data.session?.user) {
        setTimeout(() => {
          ensureProfile(data.session!.user).catch(() => {
            // silencioso
          });
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const api = useMemo(
    () => ({
      signIn: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data.user) {
          await ensureProfile(data.user);
        }
        return { error };
      },
      signUp: async (email: string, password: string) => {
        const redirectUrl = `${window.location.origin}/admin`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (!error && data.user) {
          await ensureProfile(data.user);
        }
        return { error };
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
      },
    }),
    [],
  );

  return {
    user,
    session,
    loading,
    ...api,
  };
}
