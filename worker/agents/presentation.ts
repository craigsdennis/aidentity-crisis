// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../worker-configuration.d.ts" />
import { Agent } from "agents";
import { unstable_callable as callable } from "agents";

export type Slide = {
  body: string;
  availableReactions: string[];
  title?: string | null;
};

export type PresentationState = {
  currentSlideIndex: number;
  currentSlide: Slide;
  // When enabled for a slide, map of emoji -> count
  reactionCounts: Record<string, number>;
  showLiveReactions: boolean;
};

export class PresentationAgent extends Agent<Env, PresentationState> {
  initialState = {
    currentSlideIndex: 0,
    currentSlide: {
      body: "# This is the first slide",
      availableReactions: ["🧡", "😎", "🤷‍♂️"],
      title: "Welcome",
    },
    reactionCounts: {},
    showLiveReactions: false,
  };

  onStart() {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.sql`CREATE TABLE IF NOT EXISTS slide_reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slide_index INTEGER NOT NULL,
            reaction TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`;
  }

  @callable()
  async nextSlide() {
    this.setState({
      ...this.state,
      currentSlideIndex: this.state.currentSlideIndex + 1,
    });
  }

  @callable()
  async prevSlide() {
    const nextIndex = Math.max(0, this.state.currentSlideIndex - 1);
    this.setState({
      ...this.state,
      currentSlideIndex: nextIndex,
    });
  }

  @callable()
  async storeReaction(reaction: string) {
    if (this.state.currentSlide.availableReactions.includes(reaction)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this
          .sql`INSERT INTO slide_reactions (slide_index, reaction) VALUES (${this.state.currentSlideIndex}, ${reaction})`;

        // If we're showing live reactions for this slide, refresh counts
        if (this.state.showLiveReactions) {
          const counts = this._countsForSlide(
            this.state.currentSlideIndex,
            this.state.currentSlide.availableReactions,
          );
          this.setState({
            ...this.state,
            reactionCounts: counts,
          });
        }
    } else {
        console.warn(`Reaction ${reaction} was not available`);
    }
  }

  @callable()
  async setSlide(
    index: number,
    availableReactions: string[],
    options?: {
      showLiveReactions?: boolean;
      title?: string | null;
    },
  ) {
    const bounded = Math.max(0, Math.floor(index));
    const reactions = Array.isArray(availableReactions) && availableReactions.length > 0
      ? availableReactions
      : this.state.currentSlide.availableReactions;
    const show = Boolean(options?.showLiveReactions);
    const title = options?.title ?? this.state.currentSlide.title ?? null;
    const counts = show
      ? this._countsForSlide(bounded, reactions)
      : {};
    this.setState({
      ...this.state,
      currentSlideIndex: bounded,
      currentSlide: {
        ...this.state.currentSlide,
        availableReactions: reactions,
        title,
      },
      reactionCounts: counts,
      showLiveReactions: show,
    });
  }

  // Build a reaction count map for a given slide
  private _countsForSlide(index: number, availableReactions: string[]): Record<string, number> {
    const base: Record<string, number> = Object.fromEntries(
      availableReactions.map((r) => [r, 0] as const)
    );
    const rows = this.sql<{ reaction: string; count: number }>`
      SELECT reaction as reaction, COUNT(*) as count
      FROM slide_reactions
      WHERE slide_index = ${index}
      GROUP BY reaction
    `;
    for (const row of rows) {
      const r = row.reaction;
      if (typeof r === 'string' && r in base) {
        // Ensure numeric conversion from driver
        base[r] = Number(row.count ?? 0);
      }
    }
    return base;
  }
}
