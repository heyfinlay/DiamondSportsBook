import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useDriverStandings, useRaceResults, useTeamStandings } from "@domains/standings/api/standingsApi";
import DriversStandingsTable from "../../components/standings/DriversStandingsTable";
import TeamsStandingsTable from "../../components/standings/TeamsStandingsTable";
import RaceResultsTable from "../../components/standings/RaceResultsTable";
import StandingsTabs from "../../components/standings/StandingsTabs";
const SEASON_OPTIONS = [
    {
        id: "dbgp-2024",
        label: "DBGP 2024 Season"
    }
];
const DEFAULT_SEASON_ID = SEASON_OPTIONS[0].id;
const formatDate = (dateString) => {
    if (!dateString)
        return "TBD";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime()))
        return dateString;
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
};
const getErrorMessage = (error) => {
    if (error instanceof Error)
        return error.message;
    return undefined;
};
const StandingsPage = () => {
    const [seasonId, setSeasonId] = useState(DEFAULT_SEASON_ID);
    const [activeTab, setActiveTab] = useState("drivers");
    const [selectedRound, setSelectedRound] = useState(null);
    const driversQuery = useDriverStandings(seasonId);
    const teamsQuery = useTeamStandings(seasonId);
    const raceResultsQuery = useRaceResults(seasonId);
    const raceResults = raceResultsQuery.data ?? [];
    const roundOptions = useMemo(() => {
        const map = new Map();
        for (const result of raceResults) {
            if (!map.has(result.round_number)) {
                map.set(result.round_number, {
                    round_number: result.round_number,
                    race_name: result.race_name,
                    circuit_name: result.circuit_name,
                    race_date: result.race_date,
                    session_id: result.session_id
                });
            }
        }
        return Array.from(map.values()).sort((a, b) => a.round_number - b.round_number);
    }, [raceResults]);
    useEffect(() => {
        if (!roundOptions.length) {
            setSelectedRound(null);
            return;
        }
        setSelectedRound((prev) => {
            if (prev && roundOptions.some((round) => round.round_number === prev)) {
                return prev;
            }
            return roundOptions[roundOptions.length - 1]?.round_number ?? null;
        });
    }, [roundOptions]);
    const selectedRoundResults = selectedRound
        ? raceResults.filter((result) => result.round_number === selectedRound)
        : [];
    const selectedRoundMeta = roundOptions.find((round) => round.round_number === selectedRound) ??
        (selectedRoundResults.length ? selectedRoundResults[0] : undefined);
    const latestRaceInfo = roundOptions.length > 0 ? roundOptions[roundOptions.length - 1] : undefined;
    const renderLoadingState = () => (_jsx("div", { className: "rounded-2xl border border-white/10 bg-black/40 p-6", children: _jsx("div", { className: "space-y-3", children: Array.from({ length: 6 }).map((_, index) => (_jsx("div", { className: "h-4 animate-pulse rounded-full bg-white/10" }, index))) }) }));
    const renderErrorState = (refetch, message) => (_jsxs("div", { className: "rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center text-sm", children: [_jsx("p", { className: "text-rose-100", children: message ?? "We couldn't load this data." }), _jsx("button", { type: "button", className: "mt-4 rounded-full bg-white/20 px-4 py-2 text-white transition hover:bg-white/30", onClick: refetch, children: "Retry" })] }));
    const renderDriversTab = () => {
        if (driversQuery.isLoading)
            return renderLoadingState();
        if (driversQuery.isError)
            return renderErrorState(driversQuery.refetch, getErrorMessage(driversQuery.error));
        return _jsx(DriversStandingsTable, { data: driversQuery.data ?? [] });
    };
    const renderTeamsTab = () => {
        if (teamsQuery.isLoading)
            return renderLoadingState();
        if (teamsQuery.isError)
            return renderErrorState(teamsQuery.refetch, getErrorMessage(teamsQuery.error));
        return _jsx(TeamsStandingsTable, { data: teamsQuery.data ?? [] });
    };
    const renderRaceResultsTab = () => {
        if (raceResultsQuery.isLoading)
            return renderLoadingState();
        if (raceResultsQuery.isError) {
            return renderErrorState(raceResultsQuery.refetch, getErrorMessage(raceResultsQuery.error));
        }
        if (!roundOptions.length) {
            return (_jsx("div", { className: "rounded-2xl border border-white/10 bg-black/40 p-8 text-center text-white/70", children: "Race results will appear here once the first round is classified." }));
        }
        return (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { className: "flex flex-col text-sm", children: [_jsx("label", { className: "text-white/60", children: "Round" }), _jsx("select", { className: "mt-1 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-white", value: selectedRound ?? roundOptions[roundOptions.length - 1].round_number, onChange: (event) => setSelectedRound(Number(event.target.value)), children: roundOptions.map((round) => (_jsxs("option", { value: round.round_number, children: ["Round ", round.round_number, ": ", round.race_name] }, round.round_number))) })] }), selectedRoundMeta ? (_jsxs("div", { className: "flex flex-1 flex-col rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase text-white/60", children: "Race" }), _jsx("p", { className: "text-lg font-semibold", children: selectedRoundMeta.race_name }), _jsx("p", { className: "text-sm text-white/60", children: selectedRoundMeta.circuit_name })] }), _jsxs("div", { className: "mt-3 md:mt-0", children: [_jsx("p", { className: "text-xs uppercase text-white/60", children: "Date" }), _jsx("p", { className: "text-sm font-medium text-white", children: formatDate(selectedRoundMeta.race_date) }), _jsx("p", { className: "text-xs text-white/60", children: "Official Classified Results" })] })] })) : null] }), _jsx(RaceResultsTable, { data: selectedRoundResults })] }));
    };
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("div", { className: "flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-black/60 via-black/40 to-brand/20 p-6 md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase text-white/60", children: "Standings" }), _jsx("h1", { className: "text-3xl font-bold text-white", children: "DayBreak Grand Prix Standings" }), _jsx("p", { className: "mt-2 text-sm text-white/70", children: "Official driver, team and race results for the current season." })] }), _jsxs("div", { className: "flex flex-col gap-3 md:items-end", children: [_jsxs("label", { className: "text-sm text-white/70", children: ["Season", _jsx("select", { className: "mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-white md:w-60", value: seasonId, onChange: (event) => setSeasonId(event.target.value), children: SEASON_OPTIONS.map((option) => (_jsx("option", { value: option.id, children: option.label }, option.id))) })] }), _jsx("div", { className: "rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium text-white/80", children: latestRaceInfo
                                    ? `${latestRaceInfo.race_name} – Round ${latestRaceInfo.round_number}`
                                    : "Awaiting first race" })] })] }), _jsx(StandingsTabs, { activeKey: activeTab, onChange: (key) => setActiveTab(key), tabs: [
                    { key: "drivers", label: "Drivers" },
                    { key: "teams", label: "Teams" },
                    { key: "results", label: "Race Results" }
                ] }), _jsxs("div", { children: [activeTab === "drivers" && renderDriversTab(), activeTab === "teams" && renderTeamsTab(), activeTab === "results" && renderRaceResultsTab()] })] }));
};
export default StandingsPage;
