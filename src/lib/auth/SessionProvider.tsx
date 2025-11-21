import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "@lib/supabaseClient";

type SessionActionResult = { error: AuthError | Error | null };

interface SignUpParams {
  email: string;
  password: string;
  username: string;
  icNumber: string;
}

interface SessionContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SessionActionResult>;
  signUp: (params: SignUpParams) => Promise<SessionActionResult>;
  signOut: () => Promise<SessionActionResult>;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => ({ error: null })
});

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<SessionActionResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signUp = async ({
    email,
    password,
    username,
    icNumber
  }: SignUpParams): Promise<SessionActionResult> => {
    const trimmedUsername = username.trim();
    const trimmedIc = icNumber.trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: trimmedUsername,
          ic_number: trimmedIc
        }
      }
    });

    if (error) {
      return { error };
    }

    const userId = data.user?.id;
    if (userId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          { id: userId, username: trimmedUsername, ic_phone_number: trimmedIc },
          { onConflict: "id" }
        );

      if (profileError) {
        console.error(profileError);
        return { error: new Error(profileError.message) };
      }
    }

    return { error: null };
  };

  const signOut = async (): Promise<SessionActionResult> => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = useMemo(
    () => ({ user, session, loading, signIn, signUp, signOut }),
    [user, session, loading]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
