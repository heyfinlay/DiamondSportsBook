import { RaceResult } from "@domains/standings/api/standingsApi";
type RaceResultsTableProps = {
    data: RaceResult[];
};
declare const RaceResultsTable: ({ data }: RaceResultsTableProps) => import("react/jsx-runtime").JSX.Element;
export default RaceResultsTable;
