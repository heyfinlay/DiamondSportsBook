import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMarketBuilder, fetchChampionshipTeams, fetchSessionDrivers } from "@domains/betting/api/marketAdminApi";
import { fetchSessions } from "@domains/timing/api/timingApi";
import { useToast } from "@app/components/ToastProvider";
const MARKET_OPTIONS = [
    {
        key: "WINNER_FULL_FIELD",
        title: "Full Field – Winner",
        blurb: "Single pool covering every driver in the race.",
        hint: "Ideal for headline win markets."
    },
    {
        key: "PODIUM_FULL_FIELD",
        title: "Full Field – Podium",
        blurb: "Pick any driver to finish inside the podium window.",
        hint: "Use min/max finish position to tune payouts."
    },
    {
        key: "POSITION_BRACKET",
        title: "Full Field – Position Bracket",
        blurb: "Pick a driver to finish inside a custom position band.",
        hint: "Supports Top 5 / Top 10 style bands."
    },
    {
        key: "HEAD_TO_HEAD",
        title: "Head-to-Head",
        blurb: "One pool per matchup between two drivers.",
        hint: "Great for prop slates with multiple pairings."
    },
    {
        key: "YES_NO_PROP",
        title: "Yes / No Proposition",
        blurb: "Binary proposition with Yes/No runners.",
        hint: "e.g. “Will there be a Lap 1 incident?”"
    },
    {
        key: "TEAM_POINTS",
        title: "Team Total / Best Finisher",
        blurb: "One runner per team.",
        hint: "Use for constructors-style props."
    },
    {
        key: "NUMERIC_RANGE",
        title: "Numeric Range",
        blurb: "Single pool with custom numeric bands.",
        hint: "Use for safety cars, winning margin, etc."
    }
];
const formatDriverName = (driver) => driver.number ? `${driver.number.toString().padStart(2, "0")} • ${driver.name}` : driver.name;
const toNumber = (value, fallback) => {
    if (value === undefined || value === null || value === "")
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const defaultPoolLimits = { min: "10", max: "1000", rake: "0.12" };
const MarketBuilderWizard = ({ onClose, onSuccess }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [sessionId, setSessionId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [scope, setScope] = useState("race");
    const [category, setCategory] = useState("");
    const [visibleOnLanding, setVisibleOnLanding] = useState(true);
    const [takeout, setTakeout] = useState("0.12");
    const [startsAt, setStartsAt] = useState("");
    const [marketType, setMarketType] = useState(null);
    const [positionMin, setPositionMin] = useState("1");
    const [positionMax, setPositionMax] = useState("3");
    const [numericUnit, setNumericUnit] = useState("integer");
    const [numericMetric, setNumericMetric] = useState("");
    const [includeAllDrivers, setIncludeAllDrivers] = useState(true);
    const [driverSelections, setDriverSelections] = useState({});
    const [runnerOdds, setRunnerOdds] = useState({});
    const [matchups, setMatchups] = useState([{ id: crypto.randomUUID() }]);
    const [propositionText, setPropositionText] = useState("");
    const [rangeRows, setRangeRows] = useState([
        { id: crypto.randomUUID(), label: "0" },
        { id: crypto.randomUUID(), label: "1" },
        { id: crypto.randomUUID(), label: "2+" }
    ]);
    const [selectedTeamIds, setSelectedTeamIds] = useState([]);
    const [poolOverrides, setPoolOverrides] = useState({});
    const [limits, setLimits] = useState(defaultPoolLimits);
    const sessionsQuery = useQuery({ queryKey: ["timing-sessions"], queryFn: fetchSessions });
    const driversQuery = useQuery({
        queryKey: ["timing-session-drivers", sessionId],
        queryFn: () => fetchSessionDrivers(sessionId),
        enabled: !!sessionId
    });
    const teamsQuery = useQuery({
        queryKey: ["championship-teams"],
        queryFn: fetchChampionshipTeams
    });
    const mutation = useMutation({
        mutationFn: (payload) => createMarketBuilder(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-markets"] });
            onSuccess();
        },
        onError: (error) => {
            toast({ variant: "error", title: "Unable to create market", description: error.message });
        }
    });
    const selectedSession = sessionsQuery.data?.find((s) => s.id === sessionId);
    const drivers = driversQuery.data ?? [];
    const teams = teamsQuery.data ?? [];
    const selectedDrivers = useMemo(() => {
        if (includeAllDrivers)
            return drivers;
        return drivers.filter((driver) => driverSelections[driver.id]);
    }, [drivers, includeAllDrivers, driverSelections]);
    const resolvePoolLimits = (poolId) => ({
        min_stake: toNumber(poolOverrides[poolId]?.min, toNumber(limits.min, 10)),
        max_stake: toNumber(poolOverrides[poolId]?.max, toNumber(limits.max, 1000000)),
        rake_percent: toNumber(poolOverrides[poolId]?.rake, toNumber(limits.rake, toNumber(takeout, 0.12)))
    });
    const getPoolKey = (pool) => (pool.config?.builder_key ?? pool.label ?? pool.name);
    const buildPools = () => {
        if (!marketType)
            return [];
        if (["WINNER_FULL_FIELD", "PODIUM_FULL_FIELD", "POSITION_BRACKET"].includes(marketType)) {
            const runners = selectedDrivers.map((driver) => ({
                label: formatDriverName(driver),
                participant_type: "driver",
                participant_id: driver.id,
                color: driver.primary_color ?? null,
                metadata: {
                    driver_number: driver.number,
                    team_name: driver.team_name,
                    baseline_odds: runnerOdds[driver.id] ? Number(runnerOdds[driver.id]) : null
                }
            }));
            const builderKey = "full-field";
            const poolConfig = {
                include_all_drivers: includeAllDrivers,
                position_range: marketType === "PODIUM_FULL_FIELD" || marketType === "POSITION_BRACKET"
                    ? {
                        min_finish_position: toNumber(positionMin, 1),
                        max_finish_position: toNumber(positionMax, 3)
                    }
                    : null,
                builder_key: builderKey
            };
            return [
                {
                    name: title || "Full Field",
                    label: `${title || "Full Field"} Pool`,
                    pool_type: "default",
                    config: poolConfig,
                    runners,
                    ...resolvePoolLimits(builderKey)
                }
            ];
        }
        if (marketType === "HEAD_TO_HEAD") {
            return matchups
                .filter((m) => m.driverA && m.driverB)
                .map((matchup) => {
                const driverA = drivers.find((d) => d.id === matchup.driverA);
                const driverB = drivers.find((d) => d.id === matchup.driverB);
                const label = matchup.label?.trim() ||
                    `${formatDriverName(driverA)} vs ${formatDriverName(driverB)}`;
                const builderKey = matchup.id;
                return {
                    name: label,
                    label,
                    pool_type: "h2h",
                    config: {
                        driver_a_id: driverA.id,
                        driver_b_id: driverB.id,
                        builder_key: builderKey
                    },
                    runners: [
                        {
                            label: formatDriverName(driverA),
                            participant_type: "driver",
                            participant_id: driverA.id,
                            color: driverA.primary_color ?? null,
                            metadata: {
                                opponent_driver_id: driverB.id,
                                baseline_odds: matchup.oddsA ? Number(matchup.oddsA) : null
                            }
                        },
                        {
                            label: formatDriverName(driverB),
                            participant_type: "driver",
                            participant_id: driverB.id,
                            color: driverB.primary_color ?? null,
                            metadata: {
                                opponent_driver_id: driverA.id,
                                baseline_odds: matchup.oddsB ? Number(matchup.oddsB) : null
                            }
                        }
                    ],
                    ...resolvePoolLimits(builderKey)
                };
            });
        }
        if (marketType === "YES_NO_PROP") {
            const builderKey = "yes-no";
            return [
                {
                    name: propositionText || "Yes / No",
                    label: propositionText || "Yes / No",
                    pool_type: "yes_no",
                    config: { proposition: propositionText, builder_key: builderKey },
                    runners: [
                        { label: "Yes", participant_type: "boolean", metadata: { value: true } },
                        { label: "No", participant_type: "boolean", metadata: { value: false } }
                    ],
                    ...resolvePoolLimits(builderKey)
                }
            ];
        }
        if (marketType === "NUMERIC_RANGE") {
            const builderKey = "numeric-range";
            return [
                {
                    name: numericMetric || "Range",
                    label: numericMetric || "Range",
                    pool_type: "range",
                    config: { metric_label: numericMetric, unit: numericUnit, builder_key: builderKey },
                    runners: rangeRows.map((range) => ({
                        label: range.label,
                        participant_type: "custom",
                        metadata: {
                            range_start: range.start ? Number(range.start) : null,
                            range_end: range.end ? Number(range.end) : null
                        },
                        range_start: range.start,
                        range_end: range.end
                    })),
                    ...resolvePoolLimits(builderKey)
                }
            ];
        }
        if (marketType === "TEAM_POINTS") {
            const runners = teams
                .filter((team) => selectedTeamIds.includes(team.id))
                .map((team) => ({
                label: team.name,
                participant_type: "team",
                participant_id: team.id,
                color: team.primary_color ?? null,
                metadata: {
                    team_color: team.primary_color,
                    team_secondary_color: team.secondary_color
                }
            }));
            const builderKey = "team-points";
            return [
                {
                    name: `${title || "Team Market"} Pool`,
                    label: `${title || "Team Market"} Pool`,
                    pool_type: "default",
                    runners,
                    config: { builder_key: builderKey },
                    ...resolvePoolLimits(builderKey)
                }
            ];
        }
        return [];
    };
    const poolsPreview = useMemo(() => buildPools().map((pool) => ({
        ...pool,
        config: { ...(pool.config ?? {}), builder_key: getPoolKey(pool) }
    })), [
        marketType,
        selectedDrivers,
        includeAllDrivers,
        driverSelections,
        runnerOdds,
        positionMin,
        positionMax,
        matchups,
        propositionText,
        numericMetric,
        numericUnit,
        rangeRows,
        teams,
        selectedTeamIds,
        limits,
        poolOverrides
    ]);
    const goNext = () => {
        if (step === 1) {
            if (!sessionId) {
                toast({ variant: "error", title: "Select a session", description: "Choose a timing session to link." });
                return;
            }
            if (!title.trim()) {
                toast({ variant: "error", title: "Title required", description: "Name the market container." });
                return;
            }
            setStep(2);
            return;
        }
        if (step === 2) {
            if (!marketType) {
                toast({ variant: "error", title: "Choose a market type", description: "Pick a template to continue." });
                return;
            }
            setStep(3);
            return;
        }
        if (step === 3) {
            if (!marketType)
                return;
            if (["WINNER_FULL_FIELD", "PODIUM_FULL_FIELD", "POSITION_BRACKET"].includes(marketType)) {
                if (!selectedDrivers.length) {
                    toast({ variant: "error", title: "No drivers selected", description: "Include at least one driver." });
                    return;
                }
            }
            if (marketType === "HEAD_TO_HEAD") {
                const completeRows = matchups.filter((m) => m.driverA && m.driverB);
                if (completeRows.length === 0) {
                    toast({ variant: "error", title: "Add a matchup", description: "Create at least one pairing." });
                    return;
                }
            }
            if (marketType === "YES_NO_PROP" && !propositionText.trim()) {
                toast({ variant: "error", title: "Add proposition text", description: "Describe the Yes/No question." });
                return;
            }
            if (marketType === "NUMERIC_RANGE" && (!numericMetric.trim() || rangeRows.length === 0)) {
                toast({ variant: "error", title: "Add ranges", description: "Provide a metric label and at least one band." });
                return;
            }
            if (marketType === "TEAM_POINTS" && selectedTeamIds.length === 0) {
                toast({ variant: "error", title: "Select teams", description: "Pick at least one team to include." });
                return;
            }
            setStep(4);
            return;
        }
    };
    const goPrev = () => setStep((current) => (current > 1 ? (current - 1) : current));
    const handleSubmit = () => {
        if (!marketType)
            return;
        const pools = buildPools();
        if (!pools.length) {
            toast({ variant: "error", title: "Pools missing", description: "Add at least one pool." });
            return;
        }
        const payload = {
            sessionId,
            title,
            marketType,
            scope,
            description,
            takeout: toNumber(takeout, undefined),
            startsAt: startsAt || undefined,
            config: {
                category: category || undefined,
                visible_on_landing: visibleOnLanding,
                market_type_config: marketType === "PODIUM_FULL_FIELD" || marketType === "POSITION_BRACKET"
                    ? {
                        min_finish_position: toNumber(positionMin, 1),
                        max_finish_position: toNumber(positionMax, 3)
                    }
                    : marketType === "NUMERIC_RANGE"
                        ? { unit: numericUnit, metric_label: numericMetric }
                        : undefined
            },
            pools
        };
        mutation.mutate(payload);
    };
    const toggleDriver = (driverId) => {
        setDriverSelections((current) => ({ ...current, [driverId]: !current[driverId] }));
    };
    const toggleTeam = (teamId) => {
        setSelectedTeamIds((current) => current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId]);
    };
    const updateRange = (rangeId, field, value) => {
        setRangeRows((rows) => rows.map((row) => (row.id === rangeId ? { ...row, [field]: value } : row)));
    };
    return (_jsx("div", { className: "fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4", children: _jsxs("div", { className: "max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-white/10 bg-[#04060C] p-6", children: [_jsxs("header", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "New Market" }), _jsx("h2", { className: "text-2xl font-semibold text-white", children: "Market Builder" }), _jsx("p", { className: "text-sm text-white/60", children: "Step through market type, pools, and runners with full flexibility." })] }), _jsx("button", { className: "text-white/60 hover:text-white", onClick: onClose, children: "Close" })] }), _jsxs("div", { className: "mt-6 space-y-6", children: [_jsxs("div", { className: "grid grid-cols-4 gap-2 text-xs uppercase tracking-[0.3em] text-white/50", children: [_jsx("span", { className: step === 1 ? "text-brand" : "", children: "1 \u2022 Basic" }), _jsx("span", { className: step === 2 ? "text-brand" : "", children: "2 \u2022 Type" }), _jsx("span", { className: step === 3 ? "text-brand" : "", children: "3 \u2022 Pools" }), _jsx("span", { className: step === 4 ? "text-brand" : "", children: "4 \u2022 Limits" })] }), step === 1 && (_jsxs("section", { className: "space-y-4", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Link Session" }), _jsxs("select", { className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm", value: sessionId, onChange: (event) => {
                                                setSessionId(event.target.value);
                                                if (!title && event.target.value) {
                                                    const session = sessionsQuery.data?.find((s) => s.id === event.target.value);
                                                    if (session) {
                                                        setTitle(`${session.name} Market`);
                                                    }
                                                }
                                            }, children: [_jsx("option", { value: "", children: "Select session\u2026" }), sessionsQuery.data?.map((session) => (_jsxs("option", { value: session.id, children: [session.name, " \u00B7 ", session.mode ?? "race"] }, session.id)))] }), selectedSession && (_jsxs("p", { className: "mt-2 text-xs text-white/50", children: ["Track: ", selectedSession.track_name ?? "TBC", " \u00B7 Starts ", selectedSession.starts_at ?? "TBC"] }))] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Market Title" }), _jsx("input", { type: "text", value: title, onChange: (event) => setTitle(event.target.value), className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", placeholder: "Race Winner" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Scope" }), _jsx("div", { className: "mt-2 flex gap-2", children: ["race", "qualifying"].map((value) => (_jsx("button", { type: "button", onClick: () => setScope(value), className: `flex-1 rounded-2xl border px-4 py-3 text-sm ${scope === value ? "border-brand text-brand" : "border-white/15 text-white/60"}`, children: value }, value))) })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Starts At" }), _jsx("input", { type: "datetime-local", value: startsAt, onChange: (event) => setStartsAt(event.target.value), className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3" })] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Category / Tag" }), _jsx("input", { type: "text", value: category, onChange: (event) => setCategory(event.target.value), className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", placeholder: "Race 2" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Takeout %" }), _jsx("input", { type: "number", step: "0.01", value: takeout, onChange: (event) => setTakeout(event.target.value), className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsxs("label", { className: "flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50", children: ["Landing Visibility", _jsx("input", { type: "checkbox", checked: visibleOnLanding, onChange: (event) => setVisibleOnLanding(event.target.checked), className: "h-4 w-4 rounded border-white/30 bg-black/60" })] }), _jsx("p", { className: "mt-2 text-xs text-white/60", children: "Toggle whether this market should feature on landing." })] })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("label", { className: "text-xs uppercase tracking-[0.3em] text-white/50", children: "Description" }), _jsx("textarea", { value: description, onChange: (event) => setDescription(event.target.value), className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", placeholder: "Oversee winner, podium, and prop pools for this session." })] })] })), step === 2 && (_jsx("section", { className: "grid gap-4 md:grid-cols-2", children: MARKET_OPTIONS.map((option) => (_jsxs("button", { type: "button", onClick: () => setMarketType(option.key), className: `rounded-3xl border p-4 text-left transition ${marketType === option.key ? "border-brand bg-brand/5" : "border-white/10 bg-black/40 hover:border-white/25"}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: option.title }), _jsx("div", { className: `h-4 w-4 rounded-full border ${marketType === option.key ? "border-brand bg-brand" : "border-white/30"}` })] }), _jsx("p", { className: "mt-2 text-sm text-white/70", children: option.blurb }), _jsx("p", { className: "mt-1 text-xs uppercase tracking-[0.3em] text-white/50", children: option.hint })] }, option.key))) })), step === 3 && marketType && (_jsxs("section", { className: "space-y-4", children: [["WINNER_FULL_FIELD", "PODIUM_FULL_FIELD", "POSITION_BRACKET"].includes(marketType) && (_jsxs("div", { className: "space-y-4 rounded-2xl border border-white/10 p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "Drivers" }), _jsx("p", { className: "text-sm text-white/60", children: "Include all or curate the field." })] }), _jsxs("label", { className: "flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60", children: [_jsx("input", { type: "checkbox", checked: includeAllDrivers, onChange: (event) => setIncludeAllDrivers(event.target.checked), className: "h-4 w-4 rounded border-white/30 bg-black/60" }), "Include all drivers"] })] }), ["PODIUM_FULL_FIELD", "POSITION_BRACKET"].includes(marketType) && (_jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "text-xs text-white/60", children: ["Min Finish Position", _jsx("input", { type: "number", value: positionMin, onChange: (event) => setPositionMin(event.target.value), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" })] }), _jsxs("label", { className: "text-xs text-white/60", children: ["Max Finish Position", _jsx("input", { type: "number", value: positionMax, onChange: (event) => setPositionMax(event.target.value), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" })] })] })), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [drivers.map((driver) => (_jsxs("label", { className: `flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${includeAllDrivers || driverSelections[driver.id]
                                                        ? "border-brand/60 bg-brand/5"
                                                        : "border-white/10 bg-black/40"}`, children: [_jsx("span", { className: "text-white", children: formatDriverName(driver) }), !includeAllDrivers && (_jsx("input", { type: "checkbox", checked: includeAllDrivers || !!driverSelections[driver.id], onChange: () => toggleDriver(driver.id), className: "h-4 w-4 rounded border-white/30 bg-black/60" }))] }, driver.id))), drivers.length === 0 && (_jsx("p", { className: "text-sm text-white/60", children: "Link a session to load drivers." }))] })] })), marketType === "HEAD_TO_HEAD" && (_jsxs("div", { className: "space-y-3 rounded-2xl border border-white/10 p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "Matchups" }), _jsx("button", { type: "button", onClick: () => setMatchups((rows) => [...rows, { id: crypto.randomUUID() }]), className: "text-xs uppercase tracking-[0.3em] text-brand hover:text-white", children: "+ Add Matchup" })] }), matchups.map((row) => (_jsxs("div", { className: "grid gap-3 rounded-2xl border border-white/10 p-3 md:grid-cols-5", children: [_jsxs("select", { value: row.driverA ?? "", onChange: (event) => setMatchups((rows) => rows.map((r) => (r.id === row.id ? { ...r, driverA: event.target.value } : r))), className: "rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "Driver A" }), drivers.map((driver) => (_jsx("option", { value: driver.id, children: formatDriverName(driver) }, driver.id)))] }), _jsxs("select", { value: row.driverB ?? "", onChange: (event) => setMatchups((rows) => rows.map((r) => (r.id === row.id ? { ...r, driverB: event.target.value } : r))), className: "rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "Driver B" }), drivers.map((driver) => (_jsx("option", { value: driver.id, children: formatDriverName(driver) }, driver.id)))] }), _jsx("input", { type: "text", value: row.label ?? "", onChange: (event) => setMatchups((rows) => rows.map((r) => (r.id === row.id ? { ...r, label: event.target.value } : r))), placeholder: "Label (auto if empty)", className: "rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" }), _jsx("input", { type: "number", value: row.oddsA ?? "", onChange: (event) => setMatchups((rows) => rows.map((r) => (r.id === row.id ? { ...r, oddsA: event.target.value } : r))), placeholder: "Odds A", className: "rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", value: row.oddsB ?? "", onChange: (event) => setMatchups((rows) => rows.map((r) => (r.id === row.id ? { ...r, oddsB: event.target.value } : r))), placeholder: "Odds B", className: "w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" }), matchups.length > 1 && (_jsx("button", { type: "button", className: "text-xs uppercase tracking-[0.3em] text-red-400", onClick: () => setMatchups((rows) => rows.filter((r) => r.id !== row.id)), children: "\u2715" }))] })] }, row.id)))] })), marketType === "YES_NO_PROP" && (_jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "Proposition" }), _jsx("input", { type: "text", value: propositionText, onChange: (event) => setPropositionText(event.target.value), className: "mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3", placeholder: "Will there be a Lap 1 incident?" })] })), marketType === "NUMERIC_RANGE" && (_jsxs("div", { className: "space-y-3 rounded-2xl border border-white/10 p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "Ranges" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsx("input", { type: "text", value: numericMetric, onChange: (event) => setNumericMetric(event.target.value), className: "rounded-2xl border border-white/10 bg-black/60 px-3 py-2", placeholder: "Metric label (e.g. Safety Car Count)" }), _jsxs("select", { value: numericUnit, onChange: (event) => setNumericUnit(event.target.value), className: "rounded-2xl border border-white/10 bg-black/60 px-3 py-2", children: [_jsx("option", { value: "integer", children: "Integer" }), _jsx("option", { value: "seconds", children: "Seconds" })] }), _jsx("button", { type: "button", onClick: () => setRangeRows((rows) => [...rows, { id: crypto.randomUUID(), label: "" }]), className: "rounded-2xl border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.3em] text-brand hover:border-brand", children: "+ Add Range" })] }), _jsx("div", { className: "space-y-2", children: rangeRows.map((range) => (_jsxs("div", { className: "grid gap-2 rounded-2xl border border-white/10 p-3 md:grid-cols-4", children: [_jsx("input", { type: "text", value: range.label, onChange: (event) => updateRange(range.id, "label", event.target.value), placeholder: "Label (e.g. 0-1)", className: "rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" }), _jsx("input", { type: "number", value: range.start ?? "", onChange: (event) => updateRange(range.id, "start", event.target.value), placeholder: "Start", className: "rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" }), _jsx("input", { type: "number", value: range.end ?? "", onChange: (event) => updateRange(range.id, "end", event.target.value), placeholder: "End", className: "rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" }), rangeRows.length > 1 && (_jsx("button", { type: "button", className: "text-left text-xs uppercase tracking-[0.3em] text-red-400", onClick: () => setRangeRows((rows) => rows.filter((r) => r.id !== range.id)), children: "Remove" }))] }, range.id))) })] })), marketType === "TEAM_POINTS" && (_jsxs("div", { className: "space-y-3 rounded-2xl border border-white/10 p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "Teams" }), _jsx("div", { className: "grid gap-2 md:grid-cols-2", children: teams.map((team) => (_jsxs("label", { className: `flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${selectedTeamIds.includes(team.id)
                                                    ? "border-brand/60 bg-brand/5"
                                                    : "border-white/10 bg-black/40"}`, children: [_jsx("span", { className: "text-white", children: team.name }), _jsx("input", { type: "checkbox", checked: selectedTeamIds.includes(team.id), onChange: () => toggleTeam(team.id), className: "h-4 w-4 rounded border-white/30 bg-black/60" })] }, team.id))) }), teams.length === 0 && _jsx("p", { className: "text-sm text-white/60", children: "No teams available." })] }))] })), step === 4 && (_jsxs("section", { className: "space-y-4", children: [_jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsxs("label", { className: "text-xs text-white/60", children: ["Default Min Stake", _jsx("input", { type: "number", value: limits.min, onChange: (event) => setLimits((current) => ({ ...current, min: event.target.value })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" })] }), _jsxs("label", { className: "text-xs text-white/60", children: ["Default Max Stake", _jsx("input", { type: "number", value: limits.max, onChange: (event) => setLimits((current) => ({ ...current, max: event.target.value })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" })] }), _jsxs("label", { className: "text-xs text-white/60", children: ["House Rake / Take", _jsx("input", { type: "number", step: "0.01", value: limits.rake, onChange: (event) => setLimits((current) => ({ ...current, rake: event.target.value })), className: "mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm" })] })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "Review" }), _jsxs("p", { className: "text-sm text-white/60", children: [title, " \u2022 ", scope, " \u2022 ", marketType ?? "Market", " \u2022 ", poolsPreview.length, " pool(s)"] }), _jsx("div", { className: "mt-3 space-y-3", children: poolsPreview.map((pool) => {
                                                const key = getPoolKey(pool);
                                                return (_jsxs("div", { className: "rounded-2xl border border-white/10 p-3", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm uppercase tracking-[0.3em] text-white/50", children: pool.pool_type }), _jsx("p", { className: "text-white", children: pool.label })] }), _jsxs("div", { className: "flex gap-2 text-xs text-white/60", children: [_jsxs("label", { className: "flex items-center gap-1", children: ["Min", _jsx("input", { type: "number", value: poolOverrides[key]?.min ?? "", placeholder: limits.min, onChange: (event) => setPoolOverrides((current) => ({
                                                                                        ...current,
                                                                                        [key]: { ...current[key], min: event.target.value }
                                                                                    })), className: "w-20 rounded-xl border border-white/10 bg-black/60 px-2 py-1" })] }), _jsxs("label", { className: "flex items-center gap-1", children: ["Max", _jsx("input", { type: "number", value: poolOverrides[key]?.max ?? "", placeholder: limits.max, onChange: (event) => setPoolOverrides((current) => ({
                                                                                        ...current,
                                                                                        [key]: { ...current[key], max: event.target.value }
                                                                                    })), className: "w-20 rounded-xl border border-white/10 bg-black/60 px-2 py-1" })] }), _jsxs("label", { className: "flex items-center gap-1", children: ["Rake", _jsx("input", { type: "number", step: "0.01", value: poolOverrides[key]?.rake ?? "", placeholder: limits.rake, onChange: (event) => setPoolOverrides((current) => ({
                                                                                        ...current,
                                                                                        [key]: { ...current[key], rake: event.target.value }
                                                                                    })), className: "w-20 rounded-xl border border-white/10 bg-black/60 px-2 py-1" })] })] })] }), _jsx("div", { className: "mt-2 text-sm text-white/70", children: pool.runners?.map((runner) => runner.label).join(", ") || "No runners" })] }, pool.label));
                                            }) })] })] })), _jsxs("div", { className: "flex justify-between gap-3", children: [_jsx("button", { type: "button", className: "rounded-2xl border border-white/20 px-6 py-3 text-sm uppercase tracking-[0.3em] text-white/60", onClick: step === 1 ? onClose : goPrev, children: step === 1 ? "Cancel" : "Back" }), _jsxs("div", { className: "flex gap-3", children: [step < 4 && (_jsx("button", { type: "button", className: "rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black", onClick: goNext, children: "Next" })), step === 4 && (_jsx("button", { type: "button", className: "rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black", onClick: handleSubmit, disabled: mutation.isPending, children: mutation.isPending ? "Creating…" : "Create Market" }))] })] })] })] }) }));
};
export default MarketBuilderWizard;
