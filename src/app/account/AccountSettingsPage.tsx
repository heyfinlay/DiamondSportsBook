import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useSession } from "@lib/auth/SessionProvider";
import { fetchUserProfile, updateUserProfile } from "@domains/profile/api/profileApi";
import { useToast } from "@app/components/ToastProvider";
import { supabase } from "@lib/supabaseClient";

const AccountSettingsPage = () => {
  const { user } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: () => fetchUserProfile(user?.id ?? ""),
    enabled: !!user?.id
  });

  const [characterName, setCharacterName] = useState("");
  const [username, setUsername] = useState("");
  const [icNumber, setIcNumber] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resolvedCharacterName = (profileName?: string | null) => {
    // Prefer explicit character/display name; if it matches email, fall back to username instead.
    if (profileName && profileName !== user?.email) return profileName;
    return profileQuery.data?.username ?? "";
  };

  useEffect(() => {
    if (profileQuery.data) {
      setCharacterName(resolvedCharacterName(profileQuery.data.display_name));
      setUsername(profileQuery.data.username ?? "");
      setIcNumber(profileQuery.data.ic_number ?? "");
    }
    if (user?.email) {
      setEmailInput(user.email);
    }
  }, [profileQuery.data, user?.email]);

  const identityMutation = useMutation({
    mutationFn: () =>
      updateUserProfile(user?.id ?? "", {
        display_name: characterName.trim() || undefined,
        username: username.trim() || undefined,
        ic_number: icNumber.trim() || undefined
      }),
    onSuccess: () => {
      toast({ variant: "success", title: "Profile updated" });
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
    },
    onError: (error: Error) => {
      toast({ variant: "error", title: "Unable to save profile", description: error.message });
    }
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      if (!emailInput.trim()) throw new Error("Email cannot be empty");
      const { error } = await supabase.auth.updateUser({ email: emailInput.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Email updated",
        description: "Check your inbox to confirm the address change."
      });
    },
    onError: (error: Error) => {
      toast({ variant: "error", title: "Unable to update email", description: error.message });
    }
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!newPassword || newPassword !== confirmPassword) {
        throw new Error("Passwords must match and cannot be empty.");
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ variant: "success", title: "Password updated" });
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Unable to update password",
        description: error.message
      });
    }
  });

  if (!user) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
        Sign in to manage account settings.
      </div>
    );
  }

  const handleIdentitySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    identityMutation.mutate();
  };

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    emailMutation.mutate();
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    passwordMutation.mutate();
  };

  const discordTag =
    user.user_metadata?.preferred_username ||
    user.user_metadata?.user_name ||
    user.user_metadata?.full_name ||
    null;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Account</p>
          <h1 className="text-3xl font-semibold text-white">Settings</h1>
          <p className="text-sm text-white/60">
            Update your character identity, linked email, and security credentials.
          </p>
        </div>
        <Link
          to="/account"
          className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/60"
        >
          ← Back to wallet
        </Link>
      </header>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Identity</p>
            <h2 className="text-xl font-semibold text-white">Character Profile</h2>
          </div>
          {profileQuery.isLoading && (
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Loading…</p>
          )}
        </header>

        <form onSubmit={handleIdentitySubmit} className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-1">
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">
              Character Name
            </label>
            <input
              type="text"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white"
              value={characterName}
              onChange={(event) => setCharacterName(event.target.value)}
              placeholder="e.g. Alex Mercer"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">Username</label>
            <input
              type="text"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Public handle"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">IC Number</label>
            <input
              type="text"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white"
              value={icNumber}
              onChange={(event) => setIcNumber(event.target.value)}
              placeholder="Required for onboarding"
            />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              className="rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
              disabled={identityMutation.isPending}
            >
              {identityMutation.isPending ? "Saving…" : "Save Changes"}
            </button>
            <button
              type="button"
          onClick={() => {
            setCharacterName(resolvedCharacterName(profileQuery.data?.display_name));
            setUsername(profileQuery.data?.username ?? "");
            setIcNumber(profileQuery.data?.ic_number ?? "");
          }}
              className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/5"
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Security</p>
              <h2 className="text-xl font-semibold text-white">Linked Email</h2>
            </div>
          </header>
          <form onSubmit={handleEmailSubmit} className="mt-5 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">Email</label>
              <input
                type="email"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
              />
            </div>
            <button
              type="submit"
              className="rounded-2xl bg-white/90 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
              disabled={emailMutation.isPending}
            >
              {emailMutation.isPending ? "Updating…" : "Update Email"}
            </button>
          </form>
        </article>

        <article className="rounded-3xl border border-white/10 bg-black/30 p-6">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Security</p>
              <h2 className="text-xl font-semibold text-white">Password</h2>
            </div>
          </header>
          <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">New password</label>
              <input
                type="password"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Confirm password
              </label>
              <input
                type="password"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
              />
            </div>
            <button
              type="submit"
              className="rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
              disabled={passwordMutation.isPending}
            >
              {passwordMutation.isPending ? "Updating…" : "Update Password"}
            </button>
          </form>
        </article>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Connections</p>
        <div className="mt-3 flex flex-col gap-2 text-sm text-white">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
            <span>Discord</span>
            {discordTag ? (
              <span className="text-white/70">{discordTag}</span>
            ) : (
              <span className="text-white/40">Not linked</span>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-white/60">
          Contact an admin if you need to unlink OAuth providers or update verification settings.
        </p>
      </section>
    </div>
  );
};

export default AccountSettingsPage;
