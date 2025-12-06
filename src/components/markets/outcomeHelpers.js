export const deriveOutcomeCode = (name) => {
    if (!name)
        return "—";
    const cleaned = name.replace(/[^A-Za-z0-9 ]/g, " ").trim();
    if (!cleaned)
        return "—";
    const parts = cleaned.split(/\s+/);
    const initials = parts.slice(0, 2).map((part) => part[0]).join("");
    const fallback = cleaned.replace(/\s+/g, "").slice(0, 3);
    const code = (initials || fallback).slice(0, 4).toUpperCase();
    return code || "—";
};
