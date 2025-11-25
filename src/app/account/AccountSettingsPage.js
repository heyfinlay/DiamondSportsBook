import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
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
    useEffect(() => {
        if (profileQuery.data) {
            setCharacterName(profileQuery.data.display_name ?? "");
            setUsername(profileQuery.data.username ?? "");
            setIcNumber(profileQuery.data.ic_number ?? "");
        }
        if (user?.email) {
            setEmailInput(user.email);
        }
    }, [profileQuery.data, user?.email]);
    const identityMutation = useMutation({
        mutationFn: () => updateUserProfile(user?.id ?? "", {
            display_name: characterName.trim() || undefined,
            username: username.trim() || undefined,
            ic_number: icNumber.trim() || undefined
        }),
        onSuccess: () => {
            toast({ variant: "success", title: "Profile updated" });
            queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
        },
        onError: (error) => {
            toast({ variant: "error", title: "Unable to save profile", description: error.message });
        }
    });
    const emailMutation = useMutation({
        mutationFn: async () => {
            if (!emailInput.trim())
                throw new Error("Email cannot be empty");
            const { error } = await supabase.auth.updateUser({ email: emailInput.trim() });
            if (error)
                throw error;
        },
        onSuccess: () => {
            toast({
                variant: "success",
                title: "Email updated",
                description: "Check your inbox to confirm the address change."
            });
        },
        onError: (error) => {
            toast({ variant: "error", title: "Unable to update email", description: error.message });
        }
    });
    const passwordMutation = useMutation({
        mutationFn: async () => {
            if (!newPassword || newPassword !== confirmPassword) {
                throw new Error("Passwords must match and cannot be empty.");
            }
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error)
                throw error;
        },
        onSuccess: () => {
            toast({ variant: "success", title: "Password updated" });
            setNewPassword("");
            setConfirmPassword("");
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Unable to update password",
                description: error.message
            });
        }
    });
    if (!user) {
        return (_jsx("div", { className: "rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70", children: "Sign in to manage account settings." }));
    }
    const handleIdentitySubmit = (event) => {
        event.preventDefault();
        identityMutation.mutate();
    };
    const handleEmailSubmit = (event) => {
        event.preventDefault();
        emailMutation.mutate();
    };
    const handlePasswordSubmit = (event) => {
        event.preventDefault();
        passwordMutation.mutate();
    };
    const discordTag = user.user_metadata?.preferred_username ||
        user.user_metadata?.user_name ||
        user.user_metadata?.full_name ||
        null;
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Account" }), _jsx("h1", { className: "text-3xl font-semibold text-white", children: "Settings" }), _jsx("p", { className: "text-sm text-white/60", children: "Update your character identity, linked email, and security credentials." })] }), _jsx(Link, { to: "/account", className: "rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/60", children: "\u2190 Back to wallet" })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Identity" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "Character Profile" })] }), profileQuery.isLoading && (_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/40", children: "Loading\u2026" }))] }), _jsxs("form", { onSubmit: handleIdentitySubmit, className: "mt-5 grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "md:col-span-1", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Character Name" }), _jsx("input", { type: "text", className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white", value: characterName, onChange: (event) => setCharacterName(event.target.value), placeholder: "e.g. Alex Mercer" })] }), _jsxs("div", { className: "md:col-span-1", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Username" }), _jsx("input", { type: "text", className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white", value: username, onChange: (event) => setUsername(event.target.value), placeholder: "Public handle" })] }), _jsxs("div", { className: "md:col-span-1", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "IC Number" }), _jsx("input", { type: "text", className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white", value: icNumber, onChange: (event) => setIcNumber(event.target.value), placeholder: "Required for onboarding" })] }), _jsxs("div", { className: "md:col-span-2 flex flex-wrap gap-3 pt-2", children: [_jsx("button", { type: "submit", className: "rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: identityMutation.isPending, children: identityMutation.isPending ? "Saving…" : "Save Changes" }), _jsx("button", { type: "button", onClick: () => {
                                            setCharacterName(profileQuery.data?.display_name ?? "");
                                            setUsername(profileQuery.data?.username ?? "");
                                            setIcNumber(profileQuery.data?.ic_number ?? "");
                                        }, className: "rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/5", children: "Reset" })] })] })] }), _jsxs("section", { className: "grid gap-6 md:grid-cols-2", children: [_jsxs("article", { className: "rounded-3xl border border-white/10 bg-white/5 p-6", children: [_jsx("header", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Security" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "Linked Email" })] }) }), _jsxs("form", { onSubmit: handleEmailSubmit, className: "mt-5 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Email" }), _jsx("input", { type: "email", className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white", value: emailInput, onChange: (event) => setEmailInput(event.target.value) })] }), _jsx("button", { type: "submit", className: "rounded-2xl bg-white/90 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: emailMutation.isPending, children: emailMutation.isPending ? "Updating…" : "Update Email" })] })] }), _jsxs("article", { className: "rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsx("header", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Security" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "Password" })] }) }), _jsxs("form", { onSubmit: handlePasswordSubmit, className: "mt-5 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "New password" }), _jsx("input", { type: "password", className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white", value: newPassword, onChange: (event) => setNewPassword(event.target.value), minLength: 8, placeholder: "At least 8 characters" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Confirm password" }), _jsx("input", { type: "password", className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white", value: confirmPassword, onChange: (event) => setConfirmPassword(event.target.value), minLength: 8 })] }), _jsx("button", { type: "submit", className: "rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: passwordMutation.isPending, children: passwordMutation.isPending ? "Updating…" : "Update Password" })] })] })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/20 p-6", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Connections" }), _jsx("div", { className: "mt-3 flex flex-col gap-2 text-sm text-white", children: _jsxs("div", { className: "flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3", children: [_jsx("span", { children: "Discord" }), discordTag ? (_jsx("span", { className: "text-white/70", children: discordTag })) : (_jsx("span", { className: "text-white/40", children: "Not linked" }))] }) }), _jsx("p", { className: "mt-3 text-xs text-white/60", children: "Contact an admin if you need to unlink OAuth providers or update verification settings." })] })] }));
};
export default AccountSettingsPage;
