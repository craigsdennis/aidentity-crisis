import { Agent } from "agents";
import { unstable_callable as callable } from "agents";

export type PresentationState = {
    currentSlideIndex: number;
}

export class PresentationAgent extends Agent<Env, PresentationState> {
    initialState = {
        currentSlideIndex: 0
    }

    @callable()
    async nextSlide() {
        this.setState({
            ...this.state,
            currentSlideIndex: this.state.currentSlideIndex + 1
        })
    }

}