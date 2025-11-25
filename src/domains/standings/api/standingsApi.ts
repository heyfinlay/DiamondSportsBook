import { useQuery } from "@tanstack/react-query";
import { supabase } from "@lib/supabaseClient";
import { standingsKeys } from "@lib/query/keys";

export type DriverStanding = {
  driver_id: string;
  driver_name: string;
  team_id: string;
  team_name: string;
  team_color: string;
  season_id: string;
  position: number;
  points: number;
  wins: number;
  podiums: number;
  starts: number;
  dnf_count: number;
  poles: number;
  diff_to_leader: number | null;
};

export type TeamStanding = {
  team_id: string;
  team_name: string;
  team_color: string;
  season_id: string;
  position: number;
  points: number;
  wins: number;
  podiums: number;
  starts: number;
  diff_to_leader: number | null;
};

export type RaceResult = {
  session_id: string;
  round_number: number;
  race_name: string;
  circuit_name: string;
  race_date: string;
  position_display: string;
  driver_id: string;
  driver_name: string;
  team_id: string;
  team_name: string;
  team_color: string;
  grid_position: number;
  gap_to_leader: string | null;
  status: string;
  points_awarded: number;
  fastest_lap: boolean;
};

const DRIVER_STANDINGS_VIEW = "driver_standings_view";
const TEAM_STANDINGS_VIEW = "team_standings_view";
const RACE_RESULTS_VIEW = "race_results_view";

const fetchDriverStandings = async (seasonId: string) => {
  const { data, error } = await supabase
    .from(DRIVER_STANDINGS_VIEW)
    .select("*")
    .eq("season_id", seasonId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DriverStanding[];
};

const fetchTeamStandings = async (seasonId: string) => {
  const { data, error } = await supabase
    .from(TEAM_STANDINGS_VIEW)
    .select("*")
    .eq("season_id", seasonId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TeamStanding[];
};

const fetchRaceResults = async (seasonId: string) => {
  const { data, error } = await supabase
    .from(RACE_RESULTS_VIEW)
    .select("*")
    .eq("season_id", seasonId)
    .order("round_number", { ascending: true })
    .order("position_display", { ascending: true });

  if (error) throw error;
  return (data ?? []) as RaceResult[];
};

export const useDriverStandings = (seasonId?: string) => {
  return useQuery({
    queryKey: standingsKeys.drivers(seasonId),
    queryFn: () => fetchDriverStandings(seasonId!),
    enabled: Boolean(seasonId)
  });
};

export const useTeamStandings = (seasonId?: string) => {
  return useQuery({
    queryKey: standingsKeys.teams(seasonId),
    queryFn: () => fetchTeamStandings(seasonId!),
    enabled: Boolean(seasonId)
  });
};

export const useRaceResults = (seasonId?: string) => {
  return useQuery({
    queryKey: standingsKeys.raceResults(seasonId),
    queryFn: () => fetchRaceResults(seasonId!),
    enabled: Boolean(seasonId)
  });
};
