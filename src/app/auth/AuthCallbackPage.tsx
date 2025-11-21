import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@lib/supabaseClient";

const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const finishSignIn = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        navigate("/", { replace: true });
      } else {
        navigate("/login?error=oauth", { replace: true });
      }
    };

    void finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="rounded-3xl border border-white/10 bg-black/40 px-8 py-6 text-center text-white/80">
        Finishing sign-in…
      </div>
    </div>
  );
};

export default AuthCallbackPage;
