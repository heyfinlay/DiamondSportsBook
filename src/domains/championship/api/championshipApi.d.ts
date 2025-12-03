export interface ChampionshipSeason {
    id: string;
    name: string;
    year: number | null;
    status: string;
    current_round: number | null;
}
export declare const fetchChampionshipSeasons: () => Promise<ChampionshipSeason[]>;
export declare const createChampionshipSeason: (payload: {
    name: string;
    year?: number | null;
}) => Promise<any>;
export declare const updateChampionshipSeason: (id: string, updates: Partial<Pick<ChampionshipSeason, "name" | "year" | "status" | "current_round">>) => Promise<any>;
export declare const setActiveChampionshipSeason: (id: string) => Promise<any>;
export interface ChampionshipTeam {
    id: string;
    season_id: string;
    legacy_team_id: string | null;
    name: string;
    short_code: string | null;
    primary_color: string | null;
    secondary_color: string | null;
}
export declare const fetchChampionshipTeams: (seasonId: string) => Promise<ChampionshipTeam[]>;
export declare const upsertChampionshipTeam: (team: Partial<ChampionshipTeam> & {
    season_id: string;
}) => Promise<ChampionshipTeam>;
export declare const deleteChampionshipTeam: (id: string) => Promise<void>;
export interface ChampionshipDriver {
    id: string;
    season_id: string;
    team_id: string | null;
    driver_name: string;
    car_number: number | null;
    status: "primary" | "reserve" | "inactive";
}
export declare const fetchChampionshipDrivers: (seasonId: string) => Promise<ChampionshipDriver[]>;
export declare const upsertChampionshipDriver: (driver: Partial<ChampionshipDriver> & {
    season_id: string;
}) => Promise<ChampionshipDriver>;
export declare const deleteChampionshipDriver: (id: string) => Promise<void>;
export interface ChampionshipRace {
    id: string;
    season_id: string;
    round_number: number;
    race_name: string;
    circuit_name: string | null;
    race_date: string | null;
}
export declare const fetchChampionshipRaces: (seasonId: string) => Promise<ChampionshipRace[]>;
export declare const upsertChampionshipRace: (race: Partial<ChampionshipRace> & {
    season_id: string;
}) => Promise<ChampionshipRace>;
export type DisplayLabelMode = "position" | "gap_to_leader";
export interface ChampionshipResult {
    id?: string;
    race_id: string;
    driver_id: string;
    team_id: string | null;
    finish_position: number | null;
    position_display: string | null;
    grid_position: number | null;
    gap_to_leader: string | null;
    status: string | null;
    points_awarded: number;
    fastest_lap: boolean;
    display_label_mode?: DisplayLabelMode | null;
}
export declare const fetchChampionshipResults: (raceId: string) => Promise<ChampionshipResult[]>;
export declare const upsertChampionshipResults: (results: ChampionshipResult[]) => Promise<void>;
export declare const deleteChampionshipResult: (id: string) => Promise<void>;
export declare const updateDriverManualLeaderboard: (driverId: string, payload: {
    manual_points?: number | null;
    manual_position?: number | null;
    use_manual_override: boolean;
    manual_wins?: number | null;
    manual_podiums?: number | null;
    manual_starts?: number | null;
    manual_fastest_laps?: number | null;
    use_manual_stats_override: boolean;
}) => Promise<void>;
export declare const updateTeamManualLeaderboard: (teamId: string, payload: {
    manual_points?: number | null;
    manual_position?: number | null;
    use_manual_override: boolean;
}) => Promise<void>;
