import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSession } from "@lib/auth/SessionProvider";
import { supabase } from "@lib/supabaseClient";

const siteUrl =
  (import.meta?.env?.VITE_SITE_URL as string | undefined) ||
  (typeof process !== "undefined"
    ? (process.env?.NEXT_PUBLIC_SITE_URL as string | undefined)
    : undefined) ||
  "http://localhost:3000";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [icNumber, setIcNumber] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [profileIcNumber, setProfileIcNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { user, signIn, signUp } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const fromState = (location.state as any)?.from;
  const from =
    fromState && typeof fromState.pathname === "string"
      ? `${fromState.pathname}${fromState.search ?? ""}`
      : "/";
  const modeParam = useMemo(() => new URLSearchParams(location.search).get("mode"), [location.search]);
  const [isSignUp, setIsSignUp] = useState(modeParam === "signup");
  const PROFILE_COMPLETION_GATING_ENABLED = false; // TEMP: disabled profile completion redirect to avoid RLS conflicts for super admins

  useEffect(() => {
    setIsSignUp(modeParam === "signup");
  }, [modeParam]);

  useEffect(() => {
    if (!user) {
      setProfileUsername("");
      setProfileIcNumber("");
      return;
    }
    setProfileUsername(
      user.user_metadata?.username ??
        user.user_metadata?.user_name ??
        user.user_metadata?.full_name ??
        ""
    );
    setProfileIcNumber(user.user_metadata?.ic_number ?? "");
  }, [user]);

  const needsProfileCompletion = Boolean(
    user && (!user.user_metadata?.username || !user.user_metadata?.ic_number)
  );
  const shouldForceProfileCompletion = PROFILE_COMPLETION_GATING_ENABLED && needsProfileCompletion;

  useEffect(() => {
    if (!PROFILE_COMPLETION_GATING_ENABLED) {
      // TEMP: skip profile completion enforcement until flow is redesigned
      return;
    }
    if (user && !shouldForceProfileCompletion) {
      navigate(from, { replace: true });
    }
  }, [PROFILE_COMPLETION_GATING_ENABLED, from, navigate, shouldForceProfileCompletion, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const trimmedUsername = username.trim()
        const trimmedIc = icNumber.trim()

        if (!trimmedUsername || !trimmedIc) {
          setError('Username and IC number are required.')
          return
        }

        const { data: existingUsername, error: usernameCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', trimmedUsername)
          .maybeSingle()

        if (usernameCheckError && usernameCheckError.code !== 'PGRST116') {
          setError('Unable to verify username availability.')
          return
        }

        if (existingUsername) {
          setError('That username is already taken. Choose another one.')
          return
        }

        const { error } = await signUp({
          email: email.trim(),
          password,
          username: trimmedUsername,
          icNumber: trimmedIc
        })
        if (error) {
          setError(error.message)
        } else {
          setMessage(
            'Check your email for a confirmation link. Once confirmed, you can sign in.'
          )
          setIsSignUp(false)
          setPassword('')
          setUsername('')
          setIcNumber('')
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        } else {
          // Successful login - redirect
          navigate(from, { replace: true })
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (PROFILE_COMPLETION_GATING_ENABLED && user && needsProfileCompletion) {
    const handleCompleteProfile = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!user) return;
      setError(null);
      setMessage(null);
      setLoading(true);
      try {
        const trimmedUsername = profileUsername.trim();
        const trimmedIc = profileIcNumber.trim();
        if (!trimmedUsername || !trimmedIc) {
          setError("Username and IC number are required.");
          return;
        }

        const { data: existingUsername, error: usernameCheckError } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", trimmedUsername)
          .neq("id", user.id)
          .maybeSingle();

        if (usernameCheckError && usernameCheckError.code !== "PGRST116") {
          setError("Unable to verify username availability.");
          return;
        }

        if (existingUsername) {
          setError("That username is already taken. Choose another one.");
          return;
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .update({ username: trimmedUsername, ic_number: trimmedIc, ic_phone_number: trimmedIc })
          .eq("id", user.id);

        if (profileError) {
          setError(profileError.message);
          return;
        }

        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            username: trimmedUsername,
            ic_number: trimmedIc
          }
        });

        if (metadataError) {
          setError(metadataError.message);
          return;
        }

        navigate(from, { replace: true });
      } catch (err) {
        console.error(err);
        setError("Unable to save profile details.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-md w-full space-y-8 p-8 bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-2xl border border-slate-700">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-white">Complete your profile</h2>
            <p className="mt-2 text-center text-sm text-slate-400">
              We need a username and IC number before you can place bets.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleCompleteProfile}>
            {error && (
              <div className="rounded-md bg-red-900/50 border border-red-700 p-4">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="profile-username" className="sr-only">
                  Username
                </label>
                <input
                  id="profile-username"
                  name="profile-username"
                  type="text"
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  className="relative block w-full rounded-md border border-slate-600 px-3 py-2 text-white placeholder-slate-400 bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Username"
                  required
                />
              </div>
              <div>
                <label htmlFor="profile-ic-number" className="sr-only">
                  IC Number
                </label>
                <input
                  id="profile-ic-number"
                  name="profile-ic-number"
                  type="text"
                  value={profileIcNumber}
                  onChange={(e) => setProfileIcNumber(e.target.value)}
                  className="relative block w-full rounded-md border border-slate-600 px-3 py-2 text-white placeholder-slate-400 bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="IC Number"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save and continue"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleDiscordSignIn = async () => {
    try {
      setError(null);
      setDiscordLoading(true);
      const { error: discordError } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${siteUrl}/auth/callback`
        }
      });
      if (discordError) {
        setError(discordError.message);
        setDiscordLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to start Discord login.");
      setDiscordLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-2xl border border-slate-700">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Diamond Sporting Book
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-900/50 border border-red-700 p-4">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {message && (
            <div className="rounded-md bg-green-900/50 border border-green-700 p-4">
              <p className="text-sm text-green-200">{message}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleDiscordSignIn}
              disabled={discordLoading}
              className="w-full rounded-md border border-slate-600 px-3 py-2 text-sm font-semibold text-white transition hover:border-white/60 disabled:opacity-60"
            >
              {discordLoading ? "Redirecting to Discord…" : "Continue with Discord"}
            </button>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
              <span className="h-px flex-1 bg-slate-700" />
              <span>or</span>
              <span className="h-px flex-1 bg-slate-700" />
            </div>
          </div>

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-slate-600 placeholder-slate-400 text-white bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-slate-600 placeholder-slate-400 text-white bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                minLength={6}
              />
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="sr-only">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required={isSignUp}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="relative block w-full rounded-md border border-slate-600 px-3 py-2 text-white placeholder-slate-400 bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Username"
                />
              </div>
              <div>
                <label htmlFor="ic-number" className="sr-only">
                  IC Number
                </label>
                <input
                  id="ic-number"
                  name="ic-number"
                  type="text"
                  required={isSignUp}
                  value={icNumber}
                  onChange={(e) => setIcNumber(e.target.value)}
                  className="relative block w-full rounded-md border border-slate-600 px-3 py-2 text-white placeholder-slate-400 bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="IC Number"
                />
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Processing..." : isSignUp ? "Sign up" : "Sign in"}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
                setUsername("");
                setIcNumber("");
              }}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">Race Control • Live Timing • Betting Platform</p>
        </div>
      </div>
    </div>
  );
}
