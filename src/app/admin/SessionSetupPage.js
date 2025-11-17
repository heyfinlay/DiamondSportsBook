import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@lib/supabaseClient";
const SessionSetupPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [formState, setFormState] = useState({
        name: "",
        mode: "race",
        track_name: "",
        laps_target: "",
        starts_at: "",
        drivers: []
    });
    const [statusMessage, setStatusMessage] = useState(null);
    // Fetch teams from database
    const teamsQuery = useQuery({
        queryKey: ["teams"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("teams")
                .select("*")
                .order("team_id");
            if (error)
                throw error;
            return data;
        }
    });
    // Fetch DBGP lineup template
    const dbgpLineupQuery = useQuery({
        queryKey: ["dbgp-lineup"],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("get_dbgp_lineup");
            if (error)
                throw error;
            return data;
        }
    });
    // Create session mutation
    const createSessionMutation = useMutation({
        mutationFn: async (params) => {
            const { data, error } = await supabase.rpc("timing_create_session_with_drivers", {
                p_name: params.name,
                p_mode: params.mode,
                p_track_name: params.track_name,
                p_laps_target: params.laps_target ? parseInt(params.laps_target) : null,
                p_starts_at: params.starts_at ? new Date(params.starts_at).toISOString() : null,
                p_drivers: params.drivers
            });
            if (error)
                throw error;
            return data;
        },
        onSuccess: (session) => {
            setStatusMessage({
                text: `Session "${session.name}" created successfully!`,
                type: "success"
            });
            queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });
            // Navigate to race control after brief delay
            setTimeout(() => {
                navigate(`/control/${session.id}`);
            }, 1500);
        },
        onError: (error) => {
            setStatusMessage({
                text: `Error: ${error.message}`,
                type: "error"
            });
        }
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        if (formState.drivers.length === 0) {
            setStatusMessage({
                text: "Please add at least one driver to the session",
                type: "error"
            });
            return;
        }
        setStatusMessage(null);
        createSessionMutation.mutate(formState);
    };
    const handleLoadDBGPLineup = () => {
        if (dbgpLineupQuery.data) {
            setFormState(prev => ({
                ...prev,
                drivers: dbgpLineupQuery.data
            }));
            setStatusMessage({
                text: "DBGP lineup loaded successfully",
                type: "success"
            });
        }
    };
    const handleAddDriver = () => {
        setFormState(prev => ({
            ...prev,
            drivers: [
                ...prev.drivers,
                {
                    number: prev.drivers.length + 1,
                    name: "",
                    team_name: ""
                }
            ]
        }));
    };
    const handleRemoveDriver = (index) => {
        setFormState(prev => ({
            ...prev,
            drivers: prev.drivers.filter((_, i) => i !== index)
        }));
    };
    const handleDriverChange = (index, field, value) => {
        setFormState(prev => ({
            ...prev,
            drivers: prev.drivers.map((driver, i) => i === index ? { ...driver, [field]: value } : driver)
        }));
    };
    const handleDriverTeamSelect = (index, teamId) => {
        const team = teamsQuery.data?.find(t => t.team_id === teamId);
        if (team) {
            setFormState(prev => ({
                ...prev,
                drivers: prev.drivers.map((driver, i) => i === index
                    ? {
                        ...driver,
                        team_id: team.team_id,
                        team_name: team.name,
                        primary_color: team.primary_hex,
                        secondary_color: team.secondary_hex
                    }
                    : driver)
            }));
        }
    };
    const handleClearDrivers = () => {
        setFormState(prev => ({ ...prev, drivers: [] }));
    };
    // Generate default session name based on mode
    const generateSessionName = () => {
        const modeLabel = formState.mode.charAt(0).toUpperCase() + formState.mode.slice(1);
        const track = formState.track_name || "Track";
        const date = new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
        });
        setFormState(prev => ({
            ...prev,
            name: `${track} ${modeLabel} - ${date}`
        }));
    };
    return (_jsxs("div", { className: "mx-auto max-w-6xl space-y-6", children: [_jsxs("header", { children: [_jsx("p", { className: "text-sm uppercase tracking-[0.3em] text-white/60", children: "Race Control" }), _jsx("h1", { className: "text-3xl font-semibold", children: "Session Setup" }), _jsx("p", { className: "text-sm text-white/60", children: "Configure a new timing session with drivers, teams, and event details" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/40 p-6", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Session Details" }), _jsxs("div", { className: "mt-4 grid gap-4 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Session Name" }), _jsxs("div", { className: "mt-2 flex gap-2", children: [_jsx("input", { type: "text", className: "flex-1 rounded-2xl border border-white/10 bg-black/60 px-4 py-3", value: formState.name, onChange: (e) => setFormState((prev) => ({ ...prev, name: e.target.value })), required: true, placeholder: "e.g. Spa Qualifying - Nov 17" }), _jsx("button", { type: "button", className: "rounded-2xl border border-white/20 px-4 text-xs font-semibold uppercase tracking-widest text-white/70 hover:border-white/50", onClick: generateSessionName, children: "Auto" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Session Type" }), _jsxs("select", { className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", value: formState.mode, onChange: (e) => setFormState((prev) => ({
                                                    ...prev,
                                                    mode: e.target.value
                                                })), required: true, children: [_jsx("option", { value: "practice", children: "Practice" }), _jsx("option", { value: "qualifying", children: "Qualifying" }), _jsx("option", { value: "race", children: "Race" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Track Name" }), _jsx("input", { type: "text", className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", value: formState.track_name, onChange: (e) => setFormState((prev) => ({ ...prev, track_name: e.target.value })), required: true, placeholder: "e.g. Circuit de Spa-Francorchamps" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Target Laps" }), _jsx("input", { type: "number", min: "1", className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", value: formState.laps_target, onChange: (e) => setFormState((prev) => ({ ...prev, laps_target: e.target.value })), placeholder: "Optional" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Start Time (Optional)" }), _jsx("input", { type: "datetime-local", className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", value: formState.starts_at, onChange: (e) => setFormState((prev) => ({ ...prev, starts_at: e.target.value })) })] })] })] }), _jsxs("section", { className: "rounded-3xl border border-white/10 bg-black/40 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold", children: "Driver Lineup" }), _jsxs("p", { className: "text-sm text-white/60", children: [formState.drivers.length, " driver", formState.drivers.length !== 1 ? "s" : "", " ", "configured"] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", className: "rounded-2xl bg-brand/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-brand hover:bg-brand/30", onClick: handleLoadDBGPLineup, disabled: dbgpLineupQuery.isLoading, children: dbgpLineupQuery.isLoading ? "Loading…" : "Load DBGP Lineup" }), _jsx("button", { type: "button", className: "rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/70 hover:border-white/50", onClick: handleAddDriver, children: "+ Add Driver" }), formState.drivers.length > 0 && (_jsx("button", { type: "button", className: "rounded-2xl border border-red-400/30 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-red-300 hover:border-red-400/50", onClick: handleClearDrivers, children: "Clear All" }))] })] }), formState.drivers.length === 0 ? (_jsxs("div", { className: "mt-4 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60", children: [_jsx("p", { children: "No drivers configured yet." }), _jsx("p", { className: "mt-1 text-sm", children: "Click \"Load DBGP Lineup\" to use the default championship lineup or \"Add Driver\" to add manually." })] })) : (_jsx("div", { className: "mt-4 space-y-3", children: formState.drivers.map((driver, index) => (_jsxs("div", { className: "grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-12", children: [_jsxs("div", { className: "md:col-span-1", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "#" }), _jsx("input", { type: "number", min: "1", className: "mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm", value: driver.number, onChange: (e) => handleDriverChange(index, "number", parseInt(e.target.value) || 1), required: true })] }), _jsxs("div", { className: "md:col-span-3", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Driver Name" }), _jsx("input", { type: "text", className: "mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm", value: driver.name, onChange: (e) => handleDriverChange(index, "name", e.target.value), required: true, placeholder: "e.g. Max Verstappen" })] }), _jsxs("div", { className: "md:col-span-3", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Team" }), _jsxs("select", { className: "mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm", value: driver.team_id || "", onChange: (e) => handleDriverTeamSelect(index, e.target.value), children: [_jsx("option", { value: "", children: "Select team" }), teamsQuery.data?.map((team) => (_jsxs("option", { value: team.team_id, children: [team.name, " (", team.abbrev, ")"] }, team.team_id)))] })] }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Primary Color" }), _jsxs("div", { className: "mt-1 flex items-center gap-2", children: [_jsx("input", { type: "color", className: "h-9 w-12 rounded-xl border border-white/10 bg-black/60", value: driver.primary_color || "#FFFFFF", onChange: (e) => handleDriverChange(index, "primary_color", e.target.value) }), _jsx("input", { type: "text", className: "flex-1 rounded-xl border border-white/10 bg-black/60 px-2 py-2 text-xs", value: driver.primary_color || "", onChange: (e) => handleDriverChange(index, "primary_color", e.target.value), placeholder: "#FFFFFF" })] })] }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Secondary" }), _jsxs("div", { className: "mt-1 flex items-center gap-2", children: [_jsx("input", { type: "color", className: "h-9 w-12 rounded-xl border border-white/10 bg-black/60", value: driver.secondary_color || "#000000", onChange: (e) => handleDriverChange(index, "secondary_color", e.target.value) }), _jsx("input", { type: "text", className: "flex-1 rounded-xl border border-white/10 bg-black/60 px-2 py-2 text-xs", value: driver.secondary_color || "", onChange: (e) => handleDriverChange(index, "secondary_color", e.target.value), placeholder: "#000000" })] })] }), _jsx("div", { className: "flex items-end md:col-span-1", children: _jsx("button", { type: "button", className: "w-full rounded-xl border border-red-400/30 px-2 py-2 text-xs font-semibold text-red-300 hover:border-red-400/50", onClick: () => handleRemoveDriver(index), children: "Remove" }) })] }, index))) }))] }), statusMessage && (_jsx("div", { className: `rounded-2xl border p-4 text-center ${statusMessage.type === "success"
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border-red-400/30 bg-red-400/10 text-red-300"}`, children: statusMessage.text })), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx("button", { type: "button", className: "rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white/70 hover:border-white/50", onClick: () => navigate("/admin"), children: "Cancel" }), _jsx("button", { type: "submit", disabled: createSessionMutation.isPending || formState.drivers.length === 0, className: "rounded-2xl bg-brand px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-40", children: createSessionMutation.isPending ? "Creating Session…" : "Create Session" })] })] })] }));
};
export default SessionSetupPage;
