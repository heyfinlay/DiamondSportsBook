import type { PoolLedgerEntry } from "@domains/betting/api/settlementAuditApi";
type FinalSettlementsTableProps = {
    rows: PoolLedgerEntry[];
    emptyLabel?: string;
};
export declare const FinalSettlementsTable: ({ rows, emptyLabel }: FinalSettlementsTableProps) => import("react/jsx-runtime").JSX.Element;
export default FinalSettlementsTable;
