import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMarketBuilder,
  fetchChampionshipTeams,
  fetchSessionDrivers,
  type ChampionshipTeam,
  type MarketBuilderPayload,
  type MarketBuilderPoolInput,
  type MarketScope,
  type MarketType,
  type ParticipantType,
  type PoolType,
  type SessionDriver
} from "@domains/betting/api/marketAdminApi";
import { fetchSessions, type TimingSessionSummary } from "@domains/timing/api/timingApi";
import { useToast } from "@app/components/ToastProvider";

const MARKET_OPTIONS: Array<{
  key: MarketType;
  title: string;
  blurb: string;
  hint: string;
}> = [
  {
    key: "WINNER_FULL_FIELD",
    title: "Full Field – Winner",
    blurb: "Single pool covering every driver in the race.",
    hint: "Ideal for headline win markets."
  },
  {
    key: "PODIUM_FULL_FIELD",
    title: "Full Field – Podium",
    blurb: "Pick any driver to finish inside the podium window.",
    hint: "Use min/max finish position to tune payouts."
  },
  {
    key: "POSITION_BRACKET",
    title: "Full Field – Position Bracket",
    blurb: "Pick a driver to finish inside a custom position band.",
    hint: "Supports Top 5 / Top 10 style bands."
  },
  {
    key: "HEAD_TO_HEAD",
    title: "Head-to-Head",
    blurb: "One pool per matchup between two drivers.",
    hint: "Great for prop slates with multiple pairings."
  },
  {
    key: "YES_NO_PROP",
    title: "Yes / No Proposition",
    blurb: "Binary proposition with Yes/No runners.",
    hint: "e.g. “Will there be a Lap 1 incident?”"
  },
  {
    key: "TEAM_POINTS",
    title: "Team Total / Best Finisher",
    blurb: "One runner per team.",
    hint: "Use for constructors-style props."
  },
  {
    key: "NUMERIC_RANGE",
    title: "Numeric Range",
    blurb: "Single pool with custom numeric bands.",
    hint: "Use for safety cars, winning margin, etc."
  }
];

type WizardStep = 1 | 2 | 3 | 4;

interface MatchupDraft {
  id: string;
  driverA?: string;
  driverB?: string;
  label?: string;
  oddsA?: string;
  oddsB?: string;
}

interface RangeDraft {
  id: string;
  label: string;
  start?: string;
  end?: string;
}

interface PoolOverride {
  min?: string;
  max?: string;
  rake?: string;
}

const formatDriverName = (driver: SessionDriver) =>
  driver.number ? `${driver.number.toString().padStart(2, "0")} • ${driver.name}` : driver.name;

const toNumber = (value?: string, fallback?: number) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const defaultPoolLimits = { min: "10", max: "1000", rake: "0.12" };

const MarketBuilderWizard = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>(1);
  const [sessionId, setSessionId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [scope, setScope] = useState<MarketScope>("race");
  const [category, setCategory] = useState<string>("");
  const [visibleOnLanding, setVisibleOnLanding] = useState<boolean>(true);
  const [takeout, setTakeout] = useState<string>("0.12");
  const [startsAt, setStartsAt] = useState<string>("");
  const [marketType, setMarketType] = useState<MarketType | null>(null);
  const [positionMin, setPositionMin] = useState<string>("1");
  const [positionMax, setPositionMax] = useState<string>("3");
  const [numericUnit, setNumericUnit] = useState<"integer" | "seconds">("integer");
  const [numericMetric, setNumericMetric] = useState<string>("");
  const [includeAllDrivers, setIncludeAllDrivers] = useState<boolean>(true);
  const [driverSelections, setDriverSelections] = useState<Record<string, boolean>>({});
  const [runnerOdds, setRunnerOdds] = useState<Record<string, string>>({});
  const [matchups, setMatchups] = useState<MatchupDraft[]>([{ id: crypto.randomUUID() }]);
  const [propositionText, setPropositionText] = useState<string>("");
  const [rangeRows, setRangeRows] = useState<RangeDraft[]>([
    { id: crypto.randomUUID(), label: "0" },
    { id: crypto.randomUUID(), label: "1" },
    { id: crypto.randomUUID(), label: "2+" }
  ]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [poolOverrides, setPoolOverrides] = useState<Record<string, PoolOverride>>({});
  const [limits, setLimits] = useState(defaultPoolLimits);

  const sessionsQuery = useQuery({ queryKey: ["timing-sessions"], queryFn: fetchSessions });
  const driversQuery = useQuery({
    queryKey: ["timing-session-drivers", sessionId],
    queryFn: () => fetchSessionDrivers(sessionId),
    enabled: !!sessionId
  });
  const teamsQuery = useQuery({
    queryKey: ["championship-teams"],
    queryFn: fetchChampionshipTeams
  });

  const mutation = useMutation({
    mutationFn: (payload: MarketBuilderPayload) => createMarketBuilder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-markets"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ variant: "error", title: "Unable to create market", description: error.message });
    }
  });

  const selectedSession: TimingSessionSummary | undefined = sessionsQuery.data?.find((s) => s.id === sessionId);

  const drivers: SessionDriver[] = driversQuery.data ?? [];
  const teams: ChampionshipTeam[] = teamsQuery.data ?? [];

  const selectedDrivers = useMemo(() => {
    if (includeAllDrivers) return drivers;
    return drivers.filter((driver) => driverSelections[driver.id]);
  }, [drivers, includeAllDrivers, driverSelections]);

  const resolvePoolLimits = (poolId: string) => ({
    min_stake: toNumber(poolOverrides[poolId]?.min, toNumber(limits.min, 10)),
    max_stake: toNumber(poolOverrides[poolId]?.max, toNumber(limits.max, 1000000)),
    rake_percent: toNumber(poolOverrides[poolId]?.rake, toNumber(limits.rake, toNumber(takeout, 0.12)))
  });

  const getPoolKey = (pool: MarketBuilderPoolInput) =>
    ((pool.config as { builder_key?: string } | undefined)?.builder_key ?? pool.label ?? pool.name) as string;

  const buildPools = (): MarketBuilderPoolInput[] => {
    if (!marketType) return [];

    if (["WINNER_FULL_FIELD", "PODIUM_FULL_FIELD", "POSITION_BRACKET"].includes(marketType)) {
      const runners = selectedDrivers.map((driver) => ({
        label: formatDriverName(driver),
        participant_type: "driver" as ParticipantType,
        participant_id: driver.id,
        color: driver.primary_color ?? null,
        metadata: {
          driver_number: driver.number,
          team_name: driver.team_name,
          baseline_odds: runnerOdds[driver.id] ? Number(runnerOdds[driver.id]) : null
        }
      }));

      const builderKey = "full-field";
      const poolConfig = {
        include_all_drivers: includeAllDrivers,
        position_range:
          marketType === "PODIUM_FULL_FIELD" || marketType === "POSITION_BRACKET"
            ? {
                min_finish_position: toNumber(positionMin, 1),
                max_finish_position: toNumber(positionMax, 3)
              }
            : null,
        builder_key: builderKey
      };

      return [
        {
          name: title || "Full Field",
          label: `${title || "Full Field"} Pool`,
          pool_type: "default" satisfies PoolType,
          config: poolConfig,
          runners,
          ...resolvePoolLimits(builderKey)
        }
      ];
    }

    if (marketType === "HEAD_TO_HEAD") {
      return matchups
        .filter((m) => m.driverA && m.driverB)
        .map((matchup) => {
          const driverA = drivers.find((d) => d.id === matchup.driverA)!;
          const driverB = drivers.find((d) => d.id === matchup.driverB)!;
          const label =
            matchup.label?.trim() ||
            `${formatDriverName(driverA)} vs ${formatDriverName(driverB)}`;

          const builderKey = matchup.id;
          return {
            name: label,
            label,
            pool_type: "h2h" as PoolType,
            config: {
              driver_a_id: driverA.id,
              driver_b_id: driverB.id,
              builder_key: builderKey
            },
            runners: [
              {
                label: formatDriverName(driverA),
                participant_type: "driver" as ParticipantType,
                participant_id: driverA.id,
                color: driverA.primary_color ?? null,
                metadata: {
                  opponent_driver_id: driverB.id,
                  baseline_odds: matchup.oddsA ? Number(matchup.oddsA) : null
                }
              },
              {
                label: formatDriverName(driverB),
                participant_type: "driver" as ParticipantType,
                participant_id: driverB.id,
                color: driverB.primary_color ?? null,
                metadata: {
                  opponent_driver_id: driverA.id,
                  baseline_odds: matchup.oddsB ? Number(matchup.oddsB) : null
                }
              }
            ],
            ...resolvePoolLimits(builderKey)
          };
        });
    }

    if (marketType === "YES_NO_PROP") {
      const builderKey = "yes-no";
      return [
        {
          name: propositionText || "Yes / No",
          label: propositionText || "Yes / No",
          pool_type: "yes_no" as PoolType,
          config: { proposition: propositionText, builder_key: builderKey },
          runners: [
            { label: "Yes", participant_type: "boolean" as ParticipantType, metadata: { value: true } },
            { label: "No", participant_type: "boolean" as ParticipantType, metadata: { value: false } }
          ],
          ...resolvePoolLimits(builderKey)
        }
      ];
    }

    if (marketType === "NUMERIC_RANGE") {
      const builderKey = "numeric-range";
      return [
        {
          name: numericMetric || "Range",
          label: numericMetric || "Range",
          pool_type: "range" as PoolType,
          config: { metric_label: numericMetric, unit: numericUnit, builder_key: builderKey },
          runners: rangeRows.map((range) => ({
            label: range.label,
            participant_type: "custom" as ParticipantType,
            metadata: {
              range_start: range.start ? Number(range.start) : null,
              range_end: range.end ? Number(range.end) : null
            },
            range_start: range.start,
            range_end: range.end
          })),
          ...resolvePoolLimits(builderKey)
        }
      ];
    }

    if (marketType === "TEAM_POINTS") {
      const runners = teams
        .filter((team) => selectedTeamIds.includes(team.id))
        .map((team) => ({
          label: team.name,
          participant_type: "team" as ParticipantType,
          participant_id: team.id,
          color: team.primary_color ?? null,
          metadata: {
            team_color: team.primary_color,
            team_secondary_color: team.secondary_color
          }
        }));

      const builderKey = "team-points";
      return [
        {
          name: `${title || "Team Market"} Pool`,
          label: `${title || "Team Market"} Pool`,
          pool_type: "default" as PoolType,
          runners,
          config: { builder_key: builderKey },
          ...resolvePoolLimits(builderKey)
        }
      ];
    }

    return [];
  };

  const poolsPreview = useMemo(
    () =>
      buildPools().map((pool) => ({
        ...pool,
        config: { ...(pool.config ?? {}), builder_key: getPoolKey(pool) }
      })),
    [
      marketType,
      selectedDrivers,
      includeAllDrivers,
      driverSelections,
      runnerOdds,
      positionMin,
      positionMax,
      matchups,
      propositionText,
      numericMetric,
      numericUnit,
      rangeRows,
      teams,
      selectedTeamIds,
      limits,
      poolOverrides
    ]
  );

  const goNext = () => {
    if (step === 1) {
      if (!sessionId) {
        toast({ variant: "error", title: "Select a session", description: "Choose a timing session to link." });
        return;
      }
      if (!title.trim()) {
        toast({ variant: "error", title: "Title required", description: "Name the market container." });
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!marketType) {
        toast({ variant: "error", title: "Choose a market type", description: "Pick a template to continue." });
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!marketType) return;
      if (["WINNER_FULL_FIELD", "PODIUM_FULL_FIELD", "POSITION_BRACKET"].includes(marketType)) {
        if (!selectedDrivers.length) {
          toast({ variant: "error", title: "No drivers selected", description: "Include at least one driver." });
          return;
        }
      }
      if (marketType === "HEAD_TO_HEAD") {
        const completeRows = matchups.filter((m) => m.driverA && m.driverB);
        if (completeRows.length === 0) {
          toast({ variant: "error", title: "Add a matchup", description: "Create at least one pairing." });
          return;
        }
      }
      if (marketType === "YES_NO_PROP" && !propositionText.trim()) {
        toast({ variant: "error", title: "Add proposition text", description: "Describe the Yes/No question." });
        return;
      }
      if (marketType === "NUMERIC_RANGE" && (!numericMetric.trim() || rangeRows.length === 0)) {
        toast({ variant: "error", title: "Add ranges", description: "Provide a metric label and at least one band." });
        return;
      }
      if (marketType === "TEAM_POINTS" && selectedTeamIds.length === 0) {
        toast({ variant: "error", title: "Select teams", description: "Pick at least one team to include." });
        return;
      }
      setStep(4);
      return;
    }
  };

  const goPrev = () => setStep((current) => (current > 1 ? ((current - 1) as WizardStep) : current));

  const handleSubmit = () => {
    if (!marketType) return;
    const pools = buildPools();
    if (!pools.length) {
      toast({ variant: "error", title: "Pools missing", description: "Add at least one pool." });
      return;
    }

    const payload: MarketBuilderPayload = {
      sessionId,
      title,
      marketType,
      scope,
      description,
      takeout: toNumber(takeout, undefined),
      startsAt: startsAt || undefined,
      config: {
        category: category || undefined,
        visible_on_landing: visibleOnLanding,
        market_type_config:
          marketType === "PODIUM_FULL_FIELD" || marketType === "POSITION_BRACKET"
            ? {
                min_finish_position: toNumber(positionMin, 1),
                max_finish_position: toNumber(positionMax, 3)
              }
            : marketType === "NUMERIC_RANGE"
              ? { unit: numericUnit, metric_label: numericMetric }
              : undefined
      },
      pools
    };

    mutation.mutate(payload);
  };

  const toggleDriver = (driverId: string) => {
    setDriverSelections((current) => ({ ...current, [driverId]: !current[driverId] }));
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((current) =>
      current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId]
    );
  };

  const updateRange = (rangeId: string, field: "label" | "start" | "end", value: string) => {
    setRangeRows((rows) => rows.map((row) => (row.id === rangeId ? { ...row, [field]: value } : row)));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-white/10 bg-[#04060C] p-6">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">New Market</p>
            <h2 className="text-2xl font-semibold text-white">Market Builder</h2>
            <p className="text-sm text-white/60">Step through market type, pools, and runners with full flexibility.</p>
          </div>
          <button className="text-white/60 hover:text-white" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-4 gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
            <span className={step === 1 ? "text-brand" : ""}>1 • Basic</span>
            <span className={step === 2 ? "text-brand" : ""}>2 • Type</span>
            <span className={step === 3 ? "text-brand" : ""}>3 • Pools</span>
            <span className={step === 4 ? "text-brand" : ""}>4 • Limits</span>
          </div>

          {step === 1 && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-white/10 p-4">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">Link Session</label>
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm"
                  value={sessionId}
                  onChange={(event) => {
                    setSessionId(event.target.value);
                    if (!title && event.target.value) {
                      const session = sessionsQuery.data?.find((s) => s.id === event.target.value);
                      if (session) {
                        setTitle(`${session.name} Market`);
                      }
                    }
                  }}
                >
                  <option value="">Select session…</option>
                  {sessionsQuery.data?.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name} · {session.mode ?? "race"}
                    </option>
                  ))}
                </select>
                {selectedSession && (
                  <p className="mt-2 text-xs text-white/50">
                    Track: {selectedSession.track_name ?? "TBC"} · Starts {selectedSession.starts_at ?? "TBC"}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 p-4">
                  <label className="text-xs uppercase tracking-[0.3em] text-white/50">Market Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
                    placeholder="Race Winner"
                  />
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <label className="text-xs uppercase tracking-[0.3em] text-white/50">Scope</label>
                  <div className="mt-2 flex gap-2">
                    {(["race", "qualifying"] as MarketScope[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setScope(value)}
                        className={`flex-1 rounded-2xl border px-4 py-3 text-sm ${
                          scope === value ? "border-brand text-brand" : "border-white/15 text-white/60"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <label className="text-xs uppercase tracking-[0.3em] text-white/50">Starts At</label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 p-4">
                  <label className="text-xs uppercase tracking-[0.3em] text-white/50">Category / Tag</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
                    placeholder="Race 2"
                  />
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <label className="text-xs uppercase tracking-[0.3em] text-white/50">Takeout %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={takeout}
                    onChange={(event) => setTakeout(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
                  />
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <label className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                    Landing Visibility
                    <input
                      type="checkbox"
                      checked={visibleOnLanding}
                      onChange={(event) => setVisibleOnLanding(event.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-black/60"
                    />
                  </label>
                  <p className="mt-2 text-xs text-white/60">Toggle whether this market should feature on landing.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 p-4">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
                  placeholder="Oversee winner, podium, and prop pools for this session."
                />
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="grid gap-4 md:grid-cols-2">
              {MARKET_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setMarketType(option.key)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    marketType === option.key ? "border-brand bg-brand/5" : "border-white/10 bg-black/40 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{option.title}</h3>
                    <div
                      className={`h-4 w-4 rounded-full border ${
                        marketType === option.key ? "border-brand bg-brand" : "border-white/30"
                      }`}
                    />
                  </div>
                  <p className="mt-2 text-sm text-white/70">{option.blurb}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/50">{option.hint}</p>
                </button>
              ))}
            </section>
          )}

          {step === 3 && marketType && (
            <section className="space-y-4">
              {["WINNER_FULL_FIELD", "PODIUM_FULL_FIELD", "POSITION_BRACKET"].includes(marketType) && (
                <div className="space-y-4 rounded-2xl border border-white/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Drivers</h3>
                      <p className="text-sm text-white/60">Include all or curate the field.</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                      <input
                        type="checkbox"
                        checked={includeAllDrivers}
                        onChange={(event) => setIncludeAllDrivers(event.target.checked)}
                        className="h-4 w-4 rounded border-white/30 bg-black/60"
                      />
                      Include all drivers
                    </label>
                  </div>
                  {["PODIUM_FULL_FIELD", "POSITION_BRACKET"].includes(marketType) && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-xs text-white/60">
                        Min Finish Position
                        <input
                          type="number"
                          value={positionMin}
                          onChange={(event) => setPositionMin(event.target.value)}
                          className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-xs text-white/60">
                        Max Finish Position
                        <input
                          type="number"
                          value={positionMax}
                          onChange={(event) => setPositionMax(event.target.value)}
                          className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    {drivers.map((driver) => (
                      <label
                        key={driver.id}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                          includeAllDrivers || driverSelections[driver.id]
                            ? "border-brand/60 bg-brand/5"
                            : "border-white/10 bg-black/40"
                        }`}
                      >
                        <span className="text-white">{formatDriverName(driver)}</span>
                        {!includeAllDrivers && (
                          <input
                            type="checkbox"
                            checked={includeAllDrivers || !!driverSelections[driver.id]}
                            onChange={() => toggleDriver(driver.id)}
                            className="h-4 w-4 rounded border-white/30 bg-black/60"
                          />
                        )}
                      </label>
                    ))}
                    {drivers.length === 0 && (
                      <p className="text-sm text-white/60">Link a session to load drivers.</p>
                    )}
                  </div>
                </div>
              )}

              {marketType === "HEAD_TO_HEAD" && (
                <div className="space-y-3 rounded-2xl border border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Matchups</h3>
                    <button
                      type="button"
                      onClick={() => setMatchups((rows) => [...rows, { id: crypto.randomUUID() }])}
                      className="text-xs uppercase tracking-[0.3em] text-brand hover:text-white"
                    >
                      + Add Matchup
                    </button>
                  </div>
                  {matchups.map((row) => (
                    <div key={row.id} className="grid gap-3 rounded-2xl border border-white/10 p-3 md:grid-cols-5">
                      <select
                        value={row.driverA ?? ""}
                        onChange={(event) =>
                          setMatchups((rows) =>
                            rows.map((r) => (r.id === row.id ? { ...r, driverA: event.target.value } : r))
                          )
                        }
                        className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                      >
                        <option value="">Driver A</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {formatDriverName(driver)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={row.driverB ?? ""}
                        onChange={(event) =>
                          setMatchups((rows) =>
                            rows.map((r) => (r.id === row.id ? { ...r, driverB: event.target.value } : r))
                          )
                        }
                        className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                      >
                        <option value="">Driver B</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {formatDriverName(driver)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={row.label ?? ""}
                        onChange={(event) =>
                          setMatchups((rows) =>
                            rows.map((r) => (r.id === row.id ? { ...r, label: event.target.value } : r))
                          )
                        }
                        placeholder="Label (auto if empty)"
                        className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        value={row.oddsA ?? ""}
                        onChange={(event) =>
                          setMatchups((rows) =>
                            rows.map((r) => (r.id === row.id ? { ...r, oddsA: event.target.value } : r))
                          )
                        }
                        placeholder="Odds A"
                        className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={row.oddsB ?? ""}
                          onChange={(event) =>
                            setMatchups((rows) =>
                              rows.map((r) => (r.id === row.id ? { ...r, oddsB: event.target.value } : r))
                            )
                          }
                          placeholder="Odds B"
                          className="w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                        />
                        {matchups.length > 1 && (
                          <button
                            type="button"
                            className="text-xs uppercase tracking-[0.3em] text-red-400"
                            onClick={() => setMatchups((rows) => rows.filter((r) => r.id !== row.id))}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {marketType === "YES_NO_PROP" && (
                <div className="rounded-2xl border border-white/10 p-4">
                  <h3 className="text-lg font-semibold text-white">Proposition</h3>
                  <input
                    type="text"
                    value={propositionText}
                    onChange={(event) => setPropositionText(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
                    placeholder="Will there be a Lap 1 incident?"
                  />
                </div>
              )}

              {marketType === "NUMERIC_RANGE" && (
                <div className="space-y-3 rounded-2xl border border-white/10 p-4">
                  <h3 className="text-lg font-semibold text-white">Ranges</h3>
                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      type="text"
                      value={numericMetric}
                      onChange={(event) => setNumericMetric(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2"
                      placeholder="Metric label (e.g. Safety Car Count)"
                    />
                    <select
                      value={numericUnit}
                      onChange={(event) => setNumericUnit(event.target.value as "integer" | "seconds")}
                      className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2"
                    >
                      <option value="integer">Integer</option>
                      <option value="seconds">Seconds</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setRangeRows((rows) => [...rows, { id: crypto.randomUUID(), label: "" }])}
                      className="rounded-2xl border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.3em] text-brand hover:border-brand"
                    >
                      + Add Range
                    </button>
                  </div>
                  <div className="space-y-2">
                    {rangeRows.map((range) => (
                      <div key={range.id} className="grid gap-2 rounded-2xl border border-white/10 p-3 md:grid-cols-4">
                        <input
                          type="text"
                          value={range.label}
                          onChange={(event) => updateRange(range.id, "label", event.target.value)}
                          placeholder="Label (e.g. 0-1)"
                          className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          value={range.start ?? ""}
                          onChange={(event) => updateRange(range.id, "start", event.target.value)}
                          placeholder="Start"
                          className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          value={range.end ?? ""}
                          onChange={(event) => updateRange(range.id, "end", event.target.value)}
                          placeholder="End"
                          className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                        />
                        {rangeRows.length > 1 && (
                          <button
                            type="button"
                            className="text-left text-xs uppercase tracking-[0.3em] text-red-400"
                            onClick={() => setRangeRows((rows) => rows.filter((r) => r.id !== range.id))}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {marketType === "TEAM_POINTS" && (
                <div className="space-y-3 rounded-2xl border border-white/10 p-4">
                  <h3 className="text-lg font-semibold text-white">Teams</h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {teams.map((team) => (
                      <label
                        key={team.id}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                          selectedTeamIds.includes(team.id)
                            ? "border-brand/60 bg-brand/5"
                            : "border-white/10 bg-black/40"
                        }`}
                      >
                        <span className="text-white">{team.name}</span>
                        <input
                          type="checkbox"
                          checked={selectedTeamIds.includes(team.id)}
                          onChange={() => toggleTeam(team.id)}
                          className="h-4 w-4 rounded border-white/30 bg-black/60"
                        />
                      </label>
                    ))}
                  </div>
                  {teams.length === 0 && <p className="text-sm text-white/60">No teams available.</p>}
                </div>
              )}
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs text-white/60">
                  Default Min Stake
                  <input
                    type="number"
                    value={limits.min}
                    onChange={(event) => setLimits((current) => ({ ...current, min: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-white/60">
                  Default Max Stake
                  <input
                    type="number"
                    value={limits.max}
                    onChange={(event) => setLimits((current) => ({ ...current, max: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-white/60">
                  House Rake / Take
                  <input
                    type="number"
                    step="0.01"
                    value={limits.rake}
                    onChange={(event) => setLimits((current) => ({ ...current, rake: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-white/10 p-4">
                <h3 className="text-lg font-semibold text-white">Review</h3>
                <p className="text-sm text-white/60">
                  {title} • {scope} • {marketType ?? "Market"} • {poolsPreview.length} pool(s)
                </p>
                <div className="mt-3 space-y-3">
                  {poolsPreview.map((pool) => {
                    const key = getPoolKey(pool);
                    return (
                      <div key={pool.label} className="rounded-2xl border border-white/10 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-white/50">{pool.pool_type}</p>
                            <p className="text-white">{pool.label}</p>
                          </div>
                          <div className="flex gap-2 text-xs text-white/60">
                            <label className="flex items-center gap-1">
                              Min
                              <input
                                type="number"
                                value={poolOverrides[key]?.min ?? ""}
                                placeholder={limits.min}
                                onChange={(event) =>
                                  setPoolOverrides((current) => ({
                                    ...current,
                                    [key]: { ...current[key], min: event.target.value }
                                  }))
                                }
                                className="w-20 rounded-xl border border-white/10 bg-black/60 px-2 py-1"
                              />
                            </label>
                            <label className="flex items-center gap-1">
                              Max
                              <input
                                type="number"
                                value={poolOverrides[key]?.max ?? ""}
                                placeholder={limits.max}
                                onChange={(event) =>
                                  setPoolOverrides((current) => ({
                                    ...current,
                                    [key]: { ...current[key], max: event.target.value }
                                  }))
                                }
                                className="w-20 rounded-xl border border-white/10 bg-black/60 px-2 py-1"
                              />
                            </label>
                            <label className="flex items-center gap-1">
                              Rake
                              <input
                                type="number"
                                step="0.01"
                                value={poolOverrides[key]?.rake ?? ""}
                                placeholder={limits.rake}
                                onChange={(event) =>
                                  setPoolOverrides((current) => ({
                                    ...current,
                                    [key]: { ...current[key], rake: event.target.value }
                                  }))
                                }
                                className="w-20 rounded-xl border border-white/10 bg-black/60 px-2 py-1"
                              />
                            </label>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-white/70">
                          {pool.runners?.map((runner) => runner.label).join(", ") || "No runners"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          <div className="flex justify-between gap-3">
            <button
              type="button"
              className="rounded-2xl border border-white/20 px-6 py-3 text-sm uppercase tracking-[0.3em] text-white/60"
              onClick={step === 1 ? onClose : goPrev}
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>
            <div className="flex gap-3">
              {step < 4 && (
                <button
                  type="button"
                  className="rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black"
                  onClick={goNext}
                >
                  Next
                </button>
              )}
              {step === 4 && (
                <button
                  type="button"
                  className="rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black"
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Creating…" : "Create Market"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketBuilderWizard;
