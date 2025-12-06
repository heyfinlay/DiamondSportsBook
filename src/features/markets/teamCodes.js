const TEAM_CODE_MAP = {
    EMS: "EMS",
    "Underground Club": "UGC",
    LSPD: "PD",
    "Flywheels Motorsport": "FLY",
    Mosleys: "MOS",
    "Blend & Barrel": "BNB",
    "Los Santos Customs": "LSC",
    "Bahama Mamas": "BHM"
};
export const getTeamCode = (teamName) => {
    if (!teamName)
        return "—";
    const trimmed = teamName.trim();
    if (!trimmed)
        return "—";
    const mapped = TEAM_CODE_MAP[trimmed];
    if (mapped)
        return mapped;
    // Fallback: first 3–4 uppercase characters from the name.
    const compact = trimmed.replace(/[^A-Za-z0-9]/g, "");
    return (compact.slice(0, 4) || "TEAM").toUpperCase();
};
