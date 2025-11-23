const ENDED_STATUSES = new Set(["finished", "completed", "aborted"]);
export const sessionHasEnded = (session) => {
    if (!session)
        return false;
    if (session.ended_at)
        return true;
    if (session.phase === "finished")
        return true;
    if (!session.status)
        return false;
    return ENDED_STATUSES.has(session.status);
};
