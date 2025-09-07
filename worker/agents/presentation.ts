// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../worker-configuration.d.ts" />
import { Agent } from "agents";
import { unstable_callable as callable } from "agents";

export type Slide = {
  body: string;
  availableReactions: string[];
}

export type PresentationState = {
  currentSlideIndex: number;
  currentSlide: Slide;
};

export class PresentationAgent extends Agent<Env, PresentationState> {
  initialState = {
    currentSlideIndex: 0,
    currentSlide: {
      body: "# This is the first slide",
      availableReactions: ["🧡", "😎", "🤷‍♂️"]
    },
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
    } else {
        console.warn(`Reaction ${reaction} was not available`);
    }
  }

  @callable()
  async setSlide(index: number, availableReactions: string[]) {
    const bounded = Math.max(0, Math.floor(index));
    const reactions = Array.isArray(availableReactions) && availableReactions.length > 0
      ? availableReactions
      : this.state.currentSlide.availableReactions;
    this.setState({
      ...this.state,
      currentSlideIndex: bounded,
      currentSlide: {
        ...this.state.currentSlide,
        availableReactions: reactions,
      },
    });
  }
}
