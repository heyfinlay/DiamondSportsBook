import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@lib/auth/SessionProvider";
import { fetchUserProfile, updateUserProfile } from "@domains/profile/api/profileApi";
import { useToast } from "./ToastProvider";
import { supabase } from "@lib/supabaseClient";
const CharacterSetupGate = () => {
    const { user } = useSession();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const profileQuery = useQuery({
        queryKey: ["user-profile", user?.id],
        queryFn: () => fetchUserProfile(user?.id ?? ""),
        enabled: !!user?.id
    });
    const [characterName, setCharacterName] = useState("");
    const [icNumber, setIcNumber] = useState("");
    useEffect(() => {
        if (profileQuery.data) {
            setCharacterName(profileQuery.data.display_name ?? "");
            setIcNumber(profileQuery.data.ic_number ?? "");
        }
    }, [profileQuery.data]);
    const needsSetup = !!user &&
        !profileQuery.isLoading &&
        (!profileQuery.data || !profileQuery.data.display_name || !profileQuery.data.ic_number);
    const mutation = useMutation({
        mutationFn: async () => {
            if (!user?.id)
                throw new Error("User not found");
            const trimmedName = characterName.trim();
            const trimmedIc = icNumber.trim();
            if (!trimmedName || !trimmedIc) {
                throw new Error("Character name and IC number are required.");
            }
            await updateUserProfile(user.id, {
                display_name: trimmedName,
                ic_number: trimmedIc
            });
            await supabase.auth.updateUser({
                data: {
                    character_name: trimmedName,
                    ic_number: trimmedIc
                }
            });
        },
        onSuccess: () => {
            toast({
                variant: "success",
                title: "Profile verified",
                description: "Welcome to the grid."
            });
            queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
        },
        onError: (error) => {
            toast({
                variant: "error",
                title: "Unable to save character",
                description: error.message
            });
        }
    });
    if (!needsSetup) {
        return null;
    }
    const handleSubmit = (event) => {
        event.preventDefault();
        mutation.mutate();
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4", children: _jsxs("form", { onSubmit: handleSubmit, className: "w-full max-w-md rounded-3xl border border-white/10 bg-[#04060C] p-6 text-white shadow-2xl", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.4em] text-white/60", children: "Setup" }), _jsx("h2", { className: "mt-2 text-2xl font-semibold", children: "Complete your driver profile" }), _jsx("p", { className: "mt-1 text-sm text-white/60", children: "We need a character name and IC number before you can continue." }), _jsxs("div", { className: "mt-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Character Name" }), _jsx("input", { type: "text", className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white", value: characterName, onChange: (event) => setCharacterName(event.target.value), placeholder: "e.g. Riley Dash" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "IC Number" }), _jsx("input", { type: "text", className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white", value: icNumber, onChange: (event) => setIcNumber(event.target.value), placeholder: "Unique ID for race control" })] }), _jsx("button", { type: "submit", className: "w-full rounded-2xl bg-brand py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: mutation.isPending, children: mutation.isPending ? "Saving…" : "Save and continue" })] })] }) }));
};
export default CharacterSetupGate;
