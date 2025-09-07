# Agents Overview

This app demonstrates using an Agent-driven backend for a live presentation with two front-end experiences: a presenter control surface and an audience reactions client.

## Purpose
- Provide keyboard/remote slide control for the presenter.
- Let audience members react in real time with emojis from their phones.
- Persist reactions per slide for later analysis.
- Keep transparent records of AI-assisted changes in a Truth Window.

## Architecture
- Runtime: Cloudflare Worker with Hono.
- Agents: `PresentationAgent` via the `agents` library, mounted with `hono-agents` middleware.
- UI: React + Vite. Minimal in-app routing by path for two views.

Key files
- `worker/index.ts`: wires `agentsMiddleware()` and exports `PresentationAgent`.
- `worker/agents/presentation.ts`: the agent and its state/callables.
- `src/views/PresenterView.tsx`: presenter controls + QR code.
- `src/views/AudienceView.tsx`: audience reactions.
- `src/App.tsx`: routes path `/audience` → audience, otherwise presenter.
- `truth-window/`: session logs and user prompts (see Truth Window section).

## PresentationAgent
State (`PresentationState`)
- `currentSlideIndex: number` — active slide.
- `availableReactions: string[]` — emojis displayed to the audience.

Lifecycle
- `onStart()` ensures a `slide_reactions` table exists:
  - `id` (PK), `slide_index`, `reaction`, `created_at`.

Callables
- `nextSlide()` — increments `currentSlideIndex`.
- `prevSlide()` — decrements index (not below 0).
- `storeReaction(reaction: string)` — validates against `availableReactions` and inserts a row tied to the current slide.

## Front-end integration
Connecting to the agent
```tsx
import { useAgent } from 'agents/react';
import type { PresentationState } from '../worker/agents/presentation';

const agent = useAgent<PresentationState>({
  agent: 'presentation-agent',
  onStateUpdate(state) {
    // e.g., set slide index or availableReactions
  },
});
```

Views
- Presenter (`/`):
  - Handles `ArrowLeft` → `prevSlide()` and `ArrowRight` → `nextSlide()`.
  - Buttons for Prev/Next.
  - Displays a QR code with a link to `/audience` for easy joining.
- Audience (`/audience`):
  - Renders emojis from `state.availableReactions`.
  - Tapping an emoji calls `storeReaction(emoji)`.

QR Code
- Implemented in `src/components/QRCode.tsx` using a lightweight external image service to avoid new dependencies.
- If offline/zero-network is required, replace with a local generator (e.g., `qrcode`) and bundle it.

## Truth Window
The Truth Window is a simple, auditable log of AI-assisted work and prompts to support transparency and education during the talk.

- Folder: `truth-window/`
- Format: Markdown files per session, e.g., `front-end-YYYYMMDD.md`.
- Contents:
  - Summary of changes (what/why/where).
  - Notable implementation details and verification steps.
  - “User prompts (verbatim)” capturing the exact prompts used that day.

Today’s log
- `truth-window/front-end-20250907.md` documents the presenter/audience work, agent updates, build verification, and includes the verbatim prompts.

Recommended practice
- Create a new file per meaningful work session.
- Append prompts as they are used, in order, verbatim.
- Commit the Truth Window changes together with the code they describe.

## Development
- Dev: `npm run dev` (Vite). The agent middleware is wired in the Worker; ensure your dev/proxy setup serves both the client and worker endpoints as configured for your environment.
- Build: `npm run build` (builds Worker SSR bundle and client bundle).
- Deploy: `npm run deploy` (Wrangler).

## Future enhancements
- Presenter UI: live reaction counters per slide.
- Offline QR: swap to a local QR generator.
- Slide content: bind actual slide data/components to `currentSlideIndex`.
- Analytics: simple view to query/download `slide_reactions` by slide and time.

