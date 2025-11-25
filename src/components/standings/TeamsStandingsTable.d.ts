import { TeamStanding } from "@domains/standings/api/standingsApi";
type TeamsStandingsTableProps = {
    data: TeamStanding[];
};
declare const TeamsStandingsTable: ({ data }: TeamsStandingsTableProps) => import("react/jsx-runtime").JSX.Element;
export default TeamsStandingsTable;
