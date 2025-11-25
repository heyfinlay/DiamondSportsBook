import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@app/components/ToastProvider";
import { createChampionshipSeason, deleteChampionshipDriver, deleteChampionshipResult, deleteChampionshipTeam, fetchChampionshipDrivers, fetchChampionshipRaces, fetchChampionshipResults, fetchChampionshipSeasons, fetchChampionshipTeams, setActiveChampionshipSeason, upsertChampionshipDriver, upsertChampionshipRace, upsertChampionshipResults, upsertChampionshipTeam, updateChampionshipSeason } from "@domains/championship/api/championshipApi";
const AdminChampionshipPage = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState("seasons");
    const seasonsQuery = useQuery({
        queryKey: ["championship-seasons"],
        queryFn: fetchChampionshipSeasons
    });
    const [seasonId, setSeasonId] = useState(null);
    const activeSeasonId = useMemo(() => {
        if (!seasonsQuery.data || !seasonsQuery.data.length)
            return null;
        const preferred = seasonsQuery.data.find((season) => season.status === "active") ?? seasonsQuery.data[0];
        return preferred.id;
    }, [seasonsQuery.data]);
    useEffect(() => {
        if (seasonId || !activeSeasonId)
            return;
        setSeasonId(activeSeasonId);
    }, [activeSeasonId, seasonId]);
    const teamsQuery = useQuery({
        queryKey: ["championship-teams", seasonId],
        queryFn: () => fetchChampionshipTeams(seasonId),
        enabled: Boolean(seasonId)
    });
    const driversQuery = useQuery({
        queryKey: ["championship-drivers", seasonId],
        queryFn: () => fetchChampionshipDrivers(seasonId),
        enabled: Boolean(seasonId)
    });
    const racesQuery = useQuery({
        queryKey: ["championship-races", seasonId],
        queryFn: () => fetchChampionshipRaces(seasonId),
        enabled: Boolean(seasonId)
    });
    const [raceId, setRaceId] = useState(null);
    useEffect(() => {
        if (!raceId && racesQuery.data && racesQuery.data.length) {
            setRaceId(racesQuery.data[0].id);
        }
    }, [raceId, racesQuery.data]);
    const resultsQuery = useQuery({
        queryKey: ["championship-results", raceId],
        queryFn: () => fetchChampionshipResults(raceId),
        enabled: Boolean(raceId)
    });
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Championship" }), _jsx("h1", { className: "text-3xl font-semibold text-white", children: "DayBreak Grand Prix Control" }), _jsx("p", { className: "text-sm text-white/60", children: "Manage official seasons, driver lineups and race results that power the standings experience." })] }), _jsx(Link, { to: "/standings", className: "rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/60", children: "\u2192 View public standings" })] }), _jsx("div", { className: "flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-black/20 p-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/60", children: [
                    { key: "seasons", label: "Seasons" },
                    { key: "roster", label: "Teams & Drivers" },
                    { key: "results", label: "Race Results" }
                ].map((item) => (_jsx("button", { type: "button", onClick: () => setTab(item.key), className: `rounded-xl px-4 py-2 transition ${tab === item.key ? "bg-white text-black" : "hover:text-white"}`, children: item.label }, item.key))) }), tab === "seasons" && (_jsx(SeasonManager, { seasons: seasonsQuery.data ?? [], isLoading: seasonsQuery.isLoading, onSelectSeason: setSeasonId, selectedSeasonId: seasonId })), tab === "roster" && seasonId && (_jsx(RosterManager, { seasonId: seasonId, teams: teamsQuery.data ?? [], drivers: driversQuery.data ?? [], isTeamsLoading: teamsQuery.isLoading, isDriversLoading: driversQuery.isLoading })), tab === "results" && seasonId && (_jsx(RaceResultsManager, { seasonId: seasonId, races: racesQuery.data ?? [], isRacesLoading: racesQuery.isLoading, raceId: raceId, onRaceIdChange: setRaceId, results: resultsQuery.data ?? [], isResultsLoading: resultsQuery.isLoading, drivers: driversQuery.data ?? [] }))] }));
};
const SeasonManager = ({ seasons, isLoading, onSelectSeason, selectedSeasonId }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [year, setYear] = useState("");
    const [editingSeason, setEditingSeason] = useState(null);
    const createMutation = useMutation({
        mutationFn: createChampionshipSeason,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["championship-seasons"] });
            toast({ variant: "success", title: "Season created" });
            setName("");
            setYear("");
        },
        onError: (error) => toast({ variant: "error", title: "Unable to save", description: error.message })
    });
    const updateMutation = useMutation({
        mutationFn: (payload) => updateChampionshipSeason(payload.id, payload.updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["championship-seasons"] });
            toast({ variant: "success", title: "Season updated" });
            setEditingSeason(null);
            setName("");
            setYear("");
        },
        onError: (error) => toast({ variant: "error", title: "Unable to update", description: error.message })
    });
    const setActiveMutation = useMutation({
        mutationFn: setActiveChampionshipSeason,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["championship-seasons"] });
            toast({ variant: "success", title: "Active season set" });
        },
        onError: (error) => toast({ variant: "error", title: "Unable to set active season", description: error.message })
    });
    const handleSubmit = (event) => {
        event.preventDefault();
        if (!name.trim()) {
            toast({ variant: "error", title: "Name required", description: "Season name cannot be empty." });
            return;
        }
        if (editingSeason) {
            updateMutation.mutate({
                id: editingSeason.id,
                updates: { name: name.trim(), year: year ? Number(year) : null }
            });
            return;
        }
        createMutation.mutate({ name: name.trim(), year: year ? Number(year) : null });
    };
    if (isLoading) {
        return _jsx("p", { className: "text-sm text-white/60", children: "Loading seasons\u2026" });
    }
    return (_jsxs("section", { className: "space-y-6", children: [_jsxs("form", { onSubmit: handleSubmit, className: "rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: editingSeason ? "Edit season" : "Create season" }), _jsxs("div", { className: "mt-4 grid gap-3 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Name" }), _jsx("input", { type: "text", value: name, onChange: (event) => setName(event.target.value), className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-2 text-white", placeholder: "Season name" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Year" }), _jsx("input", { type: "number", value: year, onChange: (event) => setYear(event.target.value), className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-2 text-white", placeholder: "2025" })] })] }), _jsxs("div", { className: "mt-4 flex gap-3", children: [_jsx("button", { type: "submit", className: "rounded-2xl bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: createMutation.isPending || updateMutation.isPending, children: editingSeason
                                    ? updateMutation.isPending
                                        ? "Saving…"
                                        : "Save changes"
                                    : createMutation.isPending
                                        ? "Creating…"
                                        : "Create season" }), editingSeason && (_jsx("button", { type: "button", className: "rounded-2xl border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70", onClick: () => {
                                    setEditingSeason(null);
                                    setName("");
                                    setYear("");
                                }, children: "Cancel" }))] })] }), _jsxs("div", { className: "space-y-3", children: [seasons.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No seasons created yet. Add your first above." })), seasons.map((season) => (_jsxs("article", { className: `flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white ${season.id === selectedSeasonId ? "ring-2 ring-brand/50" : ""}`, children: [_jsxs("div", { children: [_jsx("p", { className: "text-base font-semibold", children: season.name }), _jsxs("p", { className: "text-xs text-white/60", children: [season.year ? `${season.year} • ` : "", "Status \u00B7 ", season.status, season.current_round ? ` • Round ${season.current_round}` : ""] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("button", { type: "button", className: "rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70", onClick: () => {
                                            setEditingSeason(season);
                                            setName(season.name);
                                            setYear(season.year ? String(season.year) : "");
                                        }, children: "Edit" }), _jsx("button", { type: "button", className: "rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70", onClick: () => {
                                            onSelectSeason(season.id);
                                            toast({ variant: "success", title: "Season selected" });
                                        }, children: "Work on" }), _jsx("button", { type: "button", className: "rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70", disabled: setActiveMutation.isPending || season.status === "active", onClick: () => setActiveMutation.mutate(season.id), children: season.status === "active" ? "Active" : "Set active" })] })] }, season.id)))] })] }));
};
const RosterManager = ({ seasonId, teams, drivers, isTeamsLoading, isDriversLoading }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [teamForm, setTeamForm] = useState({
        name: "",
        short_code: "",
        legacy_team_id: "",
        primary_color: "#ffffff",
        secondary_color: "#0f0f0f"
    });
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [driverForm, setDriverForm] = useState({
        driver_name: "",
        car_number: "",
        team_id: "",
        status: "primary"
    });
    const [editingDriverId, setEditingDriverId] = useState(null);
    const teamMutation = useMutation({
        mutationFn: (payload) => upsertChampionshipTeam({
            ...payload,
            id: editingTeamId ?? undefined,
            season_id: seasonId
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["championship-teams", seasonId] });
            toast({ variant: "success", title: "Team saved" });
            setTeamForm({
                name: "",
                short_code: "",
                legacy_team_id: "",
                primary_color: "#ffffff",
                secondary_color: "#0f0f0f"
            });
            setEditingTeamId(null);
        },
        onError: (error) => toast({ variant: "error", title: "Unable to save team", description: error.message })
    });
    const driverMutation = useMutation({
        mutationFn: (payload) => upsertChampionshipDriver({
            ...payload,
            id: editingDriverId ?? undefined,
            car_number: payload.car_number ?? null,
            season_id: seasonId
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["championship-drivers", seasonId] });
            toast({ variant: "success", title: "Driver saved" });
            setDriverForm({
                driver_name: "",
                car_number: "",
                team_id: "",
                status: "primary"
            });
            setEditingDriverId(null);
        },
        onError: (error) => toast({ variant: "error", title: "Unable to save driver", description: error.message })
    });
    const deleteTeamMutation = useMutation({
        mutationFn: deleteChampionshipTeam,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["championship-teams", seasonId] });
            toast({ variant: "success", title: "Team deleted" });
        },
        onError: (error) => toast({ variant: "error", title: "Unable to delete team", description: error.message })
    });
    const deleteDriverMutation = useMutation({
        mutationFn: deleteChampionshipDriver,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["championship-drivers", seasonId] });
            toast({ variant: "success", title: "Driver removed" });
        },
        onError: (error) => toast({ variant: "error", title: "Unable to delete driver", description: error.message })
    });
    if (isTeamsLoading || isDriversLoading) {
        return _jsx("p", { className: "text-sm text-white/60", children: "Loading roster\u2026" });
    }
    return (_jsxs("section", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "space-y-4 rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsxs("header", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Teams" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "Season garage" })] }), _jsxs("form", { onSubmit: (event) => {
                            event.preventDefault();
                            if (!teamForm.name.trim()) {
                                toast({ variant: "error", title: "Team name required" });
                                return;
                            }
                            teamMutation.mutate({
                                id: editingTeamId ?? undefined,
                                name: teamForm.name.trim(),
                                short_code: teamForm.short_code?.trim() || null,
                                legacy_team_id: teamForm.legacy_team_id?.trim() || null,
                                primary_color: teamForm.primary_color,
                                secondary_color: teamForm.secondary_color
                            });
                        }, className: "space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm", children: [_jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Name" }), _jsx("input", { type: "text", value: teamForm.name, onChange: (event) => setTeamForm((prev) => ({ ...prev, name: event.target.value })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Short code" }), _jsx("input", { type: "text", value: teamForm.short_code, onChange: (event) => setTeamForm((prev) => ({ ...prev, short_code: event.target.value })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Legacy ID" }), _jsx("input", { type: "text", value: teamForm.legacy_team_id, onChange: (event) => setTeamForm((prev) => ({ ...prev, legacy_team_id: event.target.value })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white", placeholder: "Matches timing team_id (optional)" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Primary" }), _jsx("input", { type: "color", value: teamForm.primary_color, onChange: (event) => setTeamForm((prev) => ({ ...prev, primary_color: event.target.value })), className: "mt-1 h-10 w-full cursor-pointer rounded-2xl border border-white/10 bg-black/60" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Secondary" }), _jsx("input", { type: "color", value: teamForm.secondary_color, onChange: (event) => setTeamForm((prev) => ({ ...prev, secondary_color: event.target.value })), className: "mt-1 h-10 w-full cursor-pointer rounded-2xl border border-white/10 bg-black/60" })] })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "submit", className: "rounded-2xl bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: teamMutation.isPending, children: teamMutation.isPending ? "Saving…" : editingTeamId ? "Save changes" : "Add team" }), editingTeamId && (_jsx("button", { type: "button", className: "rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70", onClick: () => {
                                            setEditingTeamId(null);
                                            setTeamForm({
                                                name: "",
                                                short_code: "",
                                                legacy_team_id: "",
                                                primary_color: "#ffffff",
                                                secondary_color: "#0f0f0f"
                                            });
                                        }, children: "Cancel" }))] })] }), _jsxs("div", { className: "space-y-3 text-sm text-white", children: [teams.length === 0 && (_jsx("p", { className: "text-white/60", children: "No teams added. Use the form above to seed the grid." })), teams.map((team) => (_jsxs("article", { className: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: team.name }), _jsxs("p", { className: "text-xs text-white/60", children: ["Code ", team.short_code || "—", " \u2022 Legacy ", team.legacy_team_id || "—"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "h-6 w-6 rounded-full border border-white/10", style: { backgroundColor: team.primary_color || "#fff" } }), _jsx("button", { type: "button", className: "rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70", onClick: () => {
                                                    setEditingTeamId(team.id);
                                                    setTeamForm({
                                                        name: team.name,
                                                        short_code: team.short_code ?? "",
                                                        legacy_team_id: team.legacy_team_id ?? "",
                                                        primary_color: team.primary_color ?? "#ffffff",
                                                        secondary_color: team.secondary_color ?? "#0f0f0f"
                                                    });
                                                }, children: "Edit" }), _jsx("button", { type: "button", className: "rounded-full border border-red-500/40 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-red-200", onClick: () => {
                                                    if (!window.confirm(`Delete ${team.name}?`))
                                                        return;
                                                    deleteTeamMutation.mutate(team.id);
                                                }, children: "Remove" })] })] }, team.id)))] })] }), _jsxs("div", { className: "space-y-4 rounded-3xl border border-white/10 bg-black/30 p-6", children: [_jsxs("header", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Drivers" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "Roster" })] }), _jsxs("form", { onSubmit: (event) => {
                            event.preventDefault();
                            if (!driverForm.driver_name.trim()) {
                                toast({ variant: "error", title: "Driver name required" });
                                return;
                            }
                            driverMutation.mutate({
                                id: editingDriverId ?? undefined,
                                driver_name: driverForm.driver_name.trim(),
                                car_number: driverForm.car_number ? Number(driverForm.car_number) : null,
                                team_id: driverForm.team_id || null,
                                status: driverForm.status
                            });
                        }, className: "space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm", children: [_jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Driver" }), _jsx("input", { type: "text", value: driverForm.driver_name, onChange: (event) => setDriverForm((prev) => ({ ...prev, driver_name: event.target.value })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Car number" }), _jsx("input", { type: "number", value: driverForm.car_number, onChange: (event) => setDriverForm((prev) => ({ ...prev, car_number: event.target.value })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Team" }), _jsxs("select", { value: driverForm.team_id, onChange: (event) => setDriverForm((prev) => ({ ...prev, team_id: event.target.value })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white", children: [_jsx("option", { value: "", children: "Unassigned" }), teams.map((team) => (_jsx("option", { value: team.id, children: team.name }, team.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Status" }), _jsxs("select", { value: driverForm.status, onChange: (event) => setDriverForm((prev) => ({
                                                    ...prev,
                                                    status: event.target.value
                                                })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white", children: [_jsx("option", { value: "primary", children: "Primary" }), _jsx("option", { value: "reserve", children: "Reserve" }), _jsx("option", { value: "inactive", children: "Inactive" })] })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "submit", className: "rounded-2xl bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: driverMutation.isPending, children: driverMutation.isPending
                                            ? "Saving…"
                                            : editingDriverId
                                                ? "Save driver"
                                                : "Add driver" }), editingDriverId && (_jsx("button", { type: "button", className: "rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70", onClick: () => {
                                            setEditingDriverId(null);
                                            setDriverForm({
                                                driver_name: "",
                                                car_number: "",
                                                team_id: "",
                                                status: "primary"
                                            });
                                        }, children: "Cancel" }))] })] }), _jsxs("div", { className: "space-y-2 text-sm text-white", children: [drivers.length === 0 && (_jsx("p", { className: "text-white/60", children: "No drivers assigned yet." })), drivers.map((driver) => {
                                const team = teams.find((t) => t.id === driver.team_id);
                                return (_jsxs("article", { className: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-semibold", children: ["#", driver.car_number ?? "—", " ", driver.driver_name] }), _jsxs("p", { className: "text-xs text-white/60", children: [team ? team.name : "Unassigned", " \u2022 ", driver.status] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", className: "rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70", onClick: () => {
                                                        setEditingDriverId(driver.id);
                                                        setDriverForm({
                                                            driver_name: driver.driver_name,
                                                            car_number: driver.car_number ? String(driver.car_number) : "",
                                                            team_id: driver.team_id ?? "",
                                                            status: driver.status
                                                        });
                                                    }, children: "Edit" }), _jsx("button", { type: "button", className: "rounded-full border border-red-500/40 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-red-200", onClick: () => {
                                                        if (!window.confirm(`Remove ${driver.driver_name}?`))
                                                            return;
                                                        deleteDriverMutation.mutate(driver.id);
                                                    }, children: "Remove" })] })] }, driver.id));
                            })] })] })] }));
};
const RaceResultsManager = ({ seasonId, races, isRacesLoading, raceId, onRaceIdChange, results, isResultsLoading, drivers }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [raceForm, setRaceForm] = useState({
        race_name: "",
        circuit_name: "",
        race_date: "",
        round_number: ""
    });
    const [editingRaceId, setEditingRaceId] = useState(null);
    const [resultsDraft, setResultsDraft] = useState([]);
    useEffect(() => {
        setResultsDraft(results);
    }, [results]);
    const raceMutation = useMutation({
        mutationFn: (payload) => upsertChampionshipRace({
            id: editingRaceId ?? undefined,
            season_id: seasonId,
            round_number: payload.round_number ?? null,
            race_name: payload.race_name ?? "",
            circuit_name: payload.circuit_name ?? null,
            race_date: payload.race_date ?? null
        }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["championship-races", seasonId] });
            toast({ variant: "success", title: "Race saved" });
            setEditingRaceId(null);
            setRaceForm({ race_name: "", circuit_name: "", race_date: "", round_number: "" });
            onRaceIdChange(data.id);
        },
        onError: (error) => toast({ variant: "error", title: "Unable to save race", description: error.message })
    });
    const resultsMutation = useMutation({
        mutationFn: () => upsertChampionshipResults(resultsDraft.map((row) => ({
            ...row,
            race_id: raceId,
            finish_position: row.finish_position ?? null,
            position_display: row.position_display ??
                (row.finish_position ? String(row.finish_position) : row.status ?? null),
            points_awarded: row.points_awarded ?? 0,
            grid_position: row.grid_position ?? null,
            fastest_lap: Boolean(row.fastest_lap)
        }))),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["championship-results", raceId] });
            toast({ variant: "success", title: "Results saved" });
        },
        onError: (error) => toast({ variant: "error", title: "Unable to save results", description: error.message })
    });
    const deleteResultMutation = useMutation({
        mutationFn: deleteChampionshipResult,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["championship-results", raceId] });
            toast({ variant: "success", title: "Result entry deleted" });
        },
        onError: (error) => toast({ variant: "error", title: "Unable to delete result", description: error.message })
    });
    if (isRacesLoading) {
        return _jsx("p", { className: "text-sm text-white/60", children: "Loading races\u2026" });
    }
    return (_jsxs("section", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Race metadata" }), _jsxs("form", { onSubmit: (event) => {
                            event.preventDefault();
                            if (!raceForm.race_name.trim() || !raceForm.round_number) {
                                toast({ variant: "error", title: "Round and race name are required" });
                                return;
                            }
                            raceMutation.mutate({
                                id: editingRaceId ?? undefined,
                                race_name: raceForm.race_name.trim(),
                                circuit_name: raceForm.circuit_name?.trim() || null,
                                race_date: raceForm.race_date || null,
                                round_number: Number(raceForm.round_number)
                            });
                        }, className: "mt-4 grid gap-4 md:grid-cols-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Round number" }), _jsx("input", { type: "number", value: raceForm.round_number, onChange: (event) => setRaceForm((prev) => ({ ...prev, round_number: event.target.value })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Race" }), _jsx("input", { type: "text", value: raceForm.race_name, onChange: (event) => setRaceForm((prev) => ({ ...prev, race_name: event.target.value })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white", placeholder: "Paleto Bay GP" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Circuit" }), _jsx("input", { type: "text", value: raceForm.circuit_name, onChange: (event) => setRaceForm((prev) => ({ ...prev, circuit_name: event.target.value })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white", placeholder: "Paleto Loop" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Date" }), _jsx("input", { type: "date", value: raceForm.race_date, onChange: (event) => setRaceForm((prev) => ({ ...prev, race_date: event.target.value })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white" })] }), _jsxs("div", { className: "md:col-span-4 flex gap-2", children: [_jsx("button", { type: "submit", className: "rounded-2xl bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: raceMutation.isPending, children: raceMutation.isPending
                                            ? "Saving…"
                                            : editingRaceId
                                                ? "Save race"
                                                : "Create round" }), editingRaceId && (_jsx("button", { type: "button", className: "rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70", onClick: () => {
                                            setEditingRaceId(null);
                                            setRaceForm({ race_name: "", circuit_name: "", race_date: "", round_number: "" });
                                        }, children: "Cancel" }))] })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-2", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Select race" }), _jsxs("select", { value: raceId ?? "", onChange: (event) => onRaceIdChange(event.target.value || null), className: "rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white", children: [_jsx("option", { value: "", children: "Choose race" }), races.map((race) => (_jsxs("option", { value: race.id, children: ["Round ", race.round_number, ": ", race.race_name] }, race.id)))] }), raceId && (_jsx("button", { type: "button", className: "text-xs uppercase tracking-[0.3em] text-white/60 underline", onClick: () => {
                                    const selected = races.find((race) => race.id === raceId);
                                    if (!selected)
                                        return;
                                    setEditingRaceId(selected.id);
                                    setRaceForm({
                                        race_name: selected.race_name,
                                        circuit_name: selected.circuit_name ?? "",
                                        race_date: selected.race_date ?? "",
                                        round_number: String(selected.round_number)
                                    });
                                }, children: "Edit selected race" }))] })] }), _jsxs("div", { className: "space-y-4 rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white", children: [_jsxs("header", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "Results" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "Classified order" })] }), _jsx("button", { type: "button", className: "rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70", onClick: () => {
                                    if (!raceId) {
                                        toast({ variant: "error", title: "Select a race before adding entries" });
                                        return;
                                    }
                                    setResultsDraft((prev) => [
                                        ...prev,
                                        {
                                            race_id: raceId,
                                            driver_id: "",
                                            team_id: null,
                                            finish_position: prev.length + 1,
                                            position_display: String(prev.length + 1),
                                            grid_position: null,
                                            status: "Finished",
                                            gap_to_leader: null,
                                            points_awarded: 0,
                                            fastest_lap: false
                                        }
                                    ]);
                                }, children: "+ Add classified driver" })] }), isResultsLoading && _jsx("p", { className: "text-sm text-white/60", children: "Loading results\u2026" }), !isResultsLoading && resultsDraft.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "No entries yet. Add drivers as they are classified to populate standings." })), _jsx("div", { className: "space-y-3", children: resultsDraft.map((row, index) => {
                            const driver = drivers.find((d) => d.id === row.driver_id);
                            return (_jsxs("div", { className: "grid gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 md:grid-cols-6", children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Driver" }), _jsxs("select", { value: row.driver_id, onChange: (event) => {
                                                    const newDriver = drivers.find((d) => d.id === event.target.value);
                                                    setResultsDraft((prev) => prev.map((item, i) => i === index
                                                        ? {
                                                            ...item,
                                                            driver_id: event.target.value,
                                                            team_id: newDriver?.team_id ?? null
                                                        }
                                                        : item));
                                                }, className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white", children: [_jsx("option", { value: "", children: "Select driver" }), drivers.map((d) => (_jsxs("option", { value: d.id, children: ["#", d.car_number ?? "—", " ", d.driver_name] }, d.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Finish" }), _jsx("input", { type: "number", value: row.finish_position ?? "", onChange: (event) => setResultsDraft((prev) => prev.map((item, i) => i === index
                                                    ? {
                                                        ...item,
                                                        finish_position: event.target.value
                                                            ? Number(event.target.value)
                                                            : null,
                                                        position_display: event.target.value || item.position_display
                                                    }
                                                    : item)), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Grid" }), _jsx("input", { type: "number", value: row.grid_position ?? "", onChange: (event) => setResultsDraft((prev) => prev.map((item, i) => i === index
                                                    ? { ...item, grid_position: event.target.value ? Number(event.target.value) : null }
                                                    : item)), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Points" }), _jsx("input", { type: "number", step: "0.01", value: row.points_awarded ?? 0, onChange: (event) => setResultsDraft((prev) => prev.map((item, i) => i === index
                                                    ? { ...item, points_awarded: event.target.value ? Number(event.target.value) : 0 }
                                                    : item)), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Status" }), _jsx("input", { type: "text", value: row.status ?? "", onChange: (event) => setResultsDraft((prev) => prev.map((item, i) => i === index ? { ...item, status: event.target.value } : item)), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white", placeholder: "Finished / DNF ..." })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Flags" }), _jsxs("label", { className: "flex items-center gap-2 text-xs text-white/70", children: [_jsx("input", { type: "checkbox", checked: row.fastest_lap, onChange: (event) => setResultsDraft((prev) => prev.map((item, i) => i === index ? { ...item, fastest_lap: event.target.checked } : item)) }), "Fastest lap"] }), _jsx("button", { type: "button", className: "mt-auto rounded-full border border-red-500/40 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-red-200", onClick: () => {
                                                    const target = row.id;
                                                    if (target) {
                                                        deleteResultMutation.mutate(target);
                                                    }
                                                    setResultsDraft((prev) => prev.filter((_, i) => i !== index));
                                                }, children: "Remove" })] }), _jsxs("div", { className: "md:col-span-6 grid gap-3 md:grid-cols-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Display label" }), _jsx("input", { type: "text", value: row.position_display ?? "", onChange: (event) => setResultsDraft((prev) => prev.map((item, i) => i === index ? { ...item, position_display: event.target.value } : item)), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white", placeholder: "1 / DNF / DSQ" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/60", children: "Gap to leader" }), _jsx("input", { type: "text", value: row.gap_to_leader ?? "", onChange: (event) => setResultsDraft((prev) => prev.map((item, i) => i === index ? { ...item, gap_to_leader: event.target.value } : item)), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white", placeholder: "+4.320s / +1 Lap" })] }), _jsxs("div", { className: "text-xs text-white/50", children: [_jsx("p", { children: "Team" }), _jsx("p", { className: "text-sm text-white", children: driver?.team_id
                                                            ? `Matches ${drivers.find((d) => d.id === row.driver_id)?.driver_name ?? ""}`
                                                            : "Set via driver" })] })] })] }, row.id ?? `${row.driver_id}-${index}`));
                        }) }), raceId && resultsDraft.length > 0 && (_jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", className: "rounded-2xl bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40", disabled: resultsMutation.isPending, onClick: () => {
                                    resultsMutation.mutate();
                                }, children: resultsMutation.isPending ? "Saving…" : "Save results" }), _jsx("button", { type: "button", className: "rounded-2xl border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70", onClick: () => setResultsDraft(results), children: "Revert unsaved edits" })] }))] })] }));
};
export default AdminChampionshipPage;
