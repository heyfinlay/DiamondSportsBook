const teamColorMap: Record<string, string> = {
  "Underground Club": "#FEFF99",
  EMS: "#CAB9C4",
  "Flywheels Motorsport": "#460106",
  "Los Santos Customs": "#050505",
  "Bahama Mamas": "#74D7FC",
  LSPD: "#111A38",
  "Blend & Barrel": "#BEBEBC",
  Mosleys: "#320301"
};

export const getTeamColor = (teamName?: string | null) =>
  teamName ? teamColorMap[teamName] : undefined;
