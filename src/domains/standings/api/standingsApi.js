import { useQuery } from "@tanstack/react-query";
import { supabase } from "@lib/supabaseClient";
import { standingsKeys } from "@lib/query/keys";
const DRIVER_STANDINGS_VIEW = "driver_standings_view";
const TEAM_STANDINGS_VIEW = "team_standings_view";
const RACE_RESULTS_VIEW = "race_results_view";
export const fetchDriverStandings = async (seasonId) => {
    const { data, error } = await supabase
        .from(DRIVER_STANDINGS_VIEW)
        .select("*")
        .eq("season_id", seasonId)
        .order("position", { ascending: true });
    if (error)
        throw error;
    return (data ?? []);
};
export const fetchTeamStandings = async (seasonId) => {
    const { data, error } = await supabase
        .from(TEAM_STANDINGS_VIEW)
        .select("*")
        .eq("season_id", seasonId)
        .order("position", { ascending: true });
    if (error)
        throw error;
    return (data ?? []);
};
export const fetchRaceResults = async (seasonId) => {
    const { data, error } = await supabase
        .from(RACE_RESULTS_VIEW)
        .select("*")
        .eq("season_id", seasonId)
        .order("round_number", { ascending: true })
        .order("finish_position", { ascending: true, nullsFirst: false })
        .order("position_display", { ascending: true });
    if (error)
        throw error;
    return (data ?? []);
};
export const useDriverStandings = (seasonId) => {
    return useQuery({
        queryKey: standingsKeys.drivers(seasonId),
        queryFn: () => fetchDriverStandings(seasonId),
        enabled: Boolean(seasonId)
    });
};
export const useTeamStandings = (seasonId) => {
    return useQuery({
        queryKey: standingsKeys.teams(seasonId),
        queryFn: () => fetchTeamStandings(seasonId),
        enabled: Boolean(seasonId)
    });
};
export const useRaceResults = (seasonId) => {
    return useQuery({
        queryKey: standingsKeys.raceResults(seasonId),
        queryFn: () => fetchRaceResults(seasonId),
        enabled: Boolean(seasonId)
    });
};
