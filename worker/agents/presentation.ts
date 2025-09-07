import { Agent } from "agents";
import { unstable_callable as callable } from "agents";

export type PresentationState = {
  currentSlideIndex: number;
  availableReactions: string[];
};

export class PresentationAgent extends Agent<Env, PresentationState> {
  initialState = {
    currentSlideIndex: 0,
    availableReactions: ["🧡", "😎", "🤷‍♂️"]
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
  async storeReaction(reaction: string) {
    if (this.state.availableReactions.includes(reaction)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this
          .sql`INSERT INTO slide_reactions (slide_index, reaction) VALUES (${this.state.currentSlideIndex}, ${reaction})`;
    } else {
        console.warn(`Reaction ${reaction} was not available`);
    }
  }
}
