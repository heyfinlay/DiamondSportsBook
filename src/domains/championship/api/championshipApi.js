import { supabase } from "@lib/supabaseClient";
export const fetchChampionshipSeasons = async () => {
    const { data, error } = await supabase
        .from("championship_seasons")
        .select("id, name, year, status, current_round")
        .order("created_at", { ascending: true });
    if (error)
        throw error;
    return data ?? [];
};
export const createChampionshipSeason = async (payload) => {
    const { data, error } = await supabase
        .from("championship_seasons")
        .insert({
        name: payload.name.trim(),
        year: payload.year ?? null
    })
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
export const updateChampionshipSeason = async (id, updates) => {
    const { data, error } = await supabase
        .from("championship_seasons")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
export const setActiveChampionshipSeason = async (id) => {
    const { error: demoteError } = await supabase
        .from("championship_seasons")
        .update({ status: "archived" })
        .neq("id", id)
        .eq("status", "active");
    if (demoteError)
        throw demoteError;
    return updateChampionshipSeason(id, { status: "active" });
};
export const fetchChampionshipTeams = async (seasonId) => {
    const { data, error } = await supabase
        .from("championship_teams")
        .select("*")
        .eq("season_id", seasonId)
        .order("name");
    if (error)
        throw error;
    return (data ?? []);
};
export const upsertChampionshipTeam = async (team) => {
    const { data, error } = await supabase
        .from("championship_teams")
        .upsert(team, { onConflict: "season_id,legacy_team_id" })
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
export const deleteChampionshipTeam = async (id) => {
    const { error } = await supabase.from("championship_teams").delete().eq("id", id);
    if (error)
        throw error;
};
export const fetchChampionshipDrivers = async (seasonId) => {
    const { data, error } = await supabase
        .from("championship_drivers")
        .select("*")
        .eq("season_id", seasonId)
        .order("car_number", { ascending: true })
        .order("driver_name", { ascending: true });
    if (error)
        throw error;
    return (data ?? []);
};
export const upsertChampionshipDriver = async (driver) => {
    const { data, error } = await supabase
        .from("championship_drivers")
        .upsert(driver)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
export const deleteChampionshipDriver = async (id) => {
    const { error } = await supabase.from("championship_drivers").delete().eq("id", id);
    if (error)
        throw error;
};
export const fetchChampionshipRaces = async (seasonId) => {
    const { data, error } = await supabase
        .from("championship_races")
        .select("*")
        .eq("season_id", seasonId)
        .order("round_number", { ascending: true });
    if (error)
        throw error;
    return (data ?? []);
};
export const upsertChampionshipRace = async (race) => {
    const { data, error } = await supabase
        .from("championship_races")
        .upsert(race, { onConflict: "season_id,round_number" })
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
export const fetchChampionshipResults = async (raceId) => {
    const { data, error } = await supabase
        .from("championship_results")
        .select("*")
        .eq("race_id", raceId)
        .order("finish_position", { ascending: true })
        .order("updated_at", { ascending: true });
    if (error)
        throw error;
    return (data ?? []);
};
export const upsertChampionshipResults = async (results) => {
    const payload = results.map((row) => {
        const record = {
            race_id: row.race_id,
            driver_id: row.driver_id,
            team_id: row.team_id,
            finish_position: row.finish_position,
            position_display: row.position_display,
            grid_position: row.grid_position,
            gap_to_leader: row.gap_to_leader,
            status: row.status,
            points_awarded: row.points_awarded,
            fastest_lap: row.fastest_lap,
            display_label_mode: row.display_label_mode ?? "position"
        };
        if (row.id) {
            record.id = row.id;
        }
        return record;
    });
    const { error } = await supabase
        .from("championship_results")
        .upsert(payload, { onConflict: "race_id,driver_id" });
    if (error)
        throw error;
};
export const deleteChampionshipResult = async (id) => {
    const { error } = await supabase.from("championship_results").delete().eq("id", id);
    if (error)
        throw error;
};
export const updateDriverManualLeaderboard = async (driverId, payload) => {
    const { error } = await supabase
        .from("championship_drivers")
        .update({
        manual_points: payload.manual_points ?? null,
        manual_position: payload.manual_position ?? null,
        use_manual_override: payload.use_manual_override,
        manual_wins: payload.manual_wins ?? null,
        manual_podiums: payload.manual_podiums ?? null,
        manual_starts: payload.manual_starts ?? null,
        manual_fastest_laps: payload.manual_fastest_laps ?? null,
        use_manual_stats_override: payload.use_manual_stats_override
    })
        .eq("id", driverId);
    if (error)
        throw error;
};
export const updateTeamManualLeaderboard = async (teamId, payload) => {
    const { error } = await supabase
        .from("championship_teams")
        .update({
        manual_points: payload.manual_points ?? null,
        manual_position: payload.manual_position ?? null,
        use_manual_override: payload.use_manual_override
    })
        .eq("id", teamId);
    if (error)
        throw error;
};
