# Frontend Design Agent Prompt

Design a new frontend direction for the Diamond Sportsbook app.

This is not a generic betting app redesign. The product is shifting from an internally managed racing/timing experience into a live, externally sourced multi-sport sportsbook built around Formula 1, NRL, AFL, and MMA data. Users top up with in-game currency and place parimutuel pool bets on live and upcoming events.

Your task is to create a modern, futuristic, highly visual UI system that feels premium and sharp without becoming loud, gimmicky, or visually exhausting. Color should be used with restraint. The interface should feel atmospheric, precise, data-rich, and cinematic, with subtle accents rather than heavy neon overload.

## Design Goals

- futuristic, premium, and confident
- highly visual, with strong layout composition and deliberate imagery
- subtle accent color strategy, not rainbow, not overly saturated, not purple-by-default
- clean hierarchy for dense live sports data
- feels fast, intelligent, and polished
- works across F1, NRL, AFL, and MMA without feeling locked to one sport
- mobile and desktop both feel intentional, not scaled copies of each other

## Product Context

The app needs to support:

- live and upcoming sports events from external APIs
- auto-created betting markets
- parimutuel pools instead of fixed odds sportsbook UX
- in-game wallet top-ups and balance views
- market detail pages with live data, pool activity, and eventual settlement transparency
- wager history and account management
- admin/operations screens for market automation, feed health, and settlement review

The current product is too tied to race-specific terminology and layouts. The new design needs to be generic enough for multiple sports while still feeling distinctive and premium.

## Pages / Flows To Design

Create a coherent design system and show how it applies to these key screens:

1. Home / Live Markets landing page
2. Event detail page with live data and related pools
3. Market detail page with outcome cards, pool depth, live movement, and bet entry
4. Wallet / top-up page
5. Wagers history and wager detail page
6. Live event center for F1, NRL, AFL, and MMA event states
7. Admin operations screens for feed status, auto-generated markets, and settlement review

## Visual Direction

Aim for a restrained futuristic sports intelligence aesthetic.

Use:

- dark or near-dark base surfaces if it helps the concept, but avoid generic black-and-purple “cyberpunk”
- subtle gradients, glass, metallic, smoked surfaces, ambient glows, edge lighting, layered panels
- strong typography with personality; avoid default-feeling font choices
- image-driven hero compositions when appropriate
- data visualizations that feel elegant and readable rather than dashboard-cluttered
- strong card layouts, asymmetry, and editorial composition where useful

Avoid:

- generic sportsbook templates
- casino aesthetics
- overly bright neon everywhere
- excessive color noise
- flat enterprise dashboard blandness
- visual decisions that only work for Formula 1 and break for team sports or MMA

## Color Direction

Use a mostly restrained palette with one or two accent families only.

The mood should be:

- deep graphite, charcoal, smoked navy, or similar grounded bases
- subtle accent tones such as icy cyan, electric teal, tungsten silver, ember orange, or muted lime, but keep them controlled
- accent colors should guide attention, status, and interactivity, not flood the entire UI

## Imagery Direction

Imagery is encouraged.

Use photography, event art direction, sport-specific treatments, silhouettes, overlays, and cropped action imagery in a way that feels premium and consistent. The app should be able to feature:

- Formula 1 cars and circuits
- NRL and AFL match action
- MMA fight-card visuals

Propose how imagery should be handled so the product remains cohesive across very different sports.

## Data Presentation Requirements

The design must make these things clear at a glance:

- event status: upcoming, live, paused, completed, official
- pool status: open, suspended, closing soon, closed, settled
- total pool liquidity
- outcome share and movement
- live updates and event momentum
- settlement transparency after markets resolve

Remember that this is parimutuel betting, so pool depth and share matter more than a fixed-odds bookmaker layout.

## UX Requirements

- users should be able to scan the live markets page quickly
- event detail pages should combine live sports context and betting context cleanly
- bet entry should feel sharp and modern, not clunky or form-heavy
- wallet information should feel premium and trustworthy
- the UI should feel rich without hiding the most important actions
- empty, loading, suspended, and stale-data states should still look designed

## Motion

Use motion sparingly but meaningfully:

- elegant page reveals
- soft panel transitions
- subtle live-data pulses or state changes
- micro-animations that reinforce status and interaction

Do not use constant noisy animation.

## Deliverables

Produce:

- a clear visual concept statement
- palette and typography direction
- design system principles
- desktop and mobile concepts for the key screens
- component direction for cards, filters, tabs, live status bars, pool modules, bet slip, wallet panels, and admin tables
- image/art direction guidance
- motion guidance
- implementation notes that a React + Tailwind frontend engineer can use directly

## Technical Constraints

Design for a React + Vite + Tailwind app.

The design should be implementable without requiring a complete custom rendering engine. Ambitious is good, but it still needs to be realistically buildable in a modern frontend stack.

When proposing layouts and components, think in terms of reusable sections and design tokens, not one-off dribbble shots.

## Important Product-Specific Constraints

- this is in-game currency, not real-money payments
- the sportsbook must support multiple sports from the same UI language
- the redesign should reflect live external sports data and automated market creation
- the design should make the product feel more mature, more premium, and more current than the existing UI

## Output Style

Be concrete.

Do not give vague moodboard language only. Show what the product should actually look like, how the pages should be structured, what components are needed, how the visual system adapts by sport, and what implementation cues the engineering team should follow.

