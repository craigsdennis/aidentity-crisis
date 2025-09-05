import { Agent } from "agents";

export type PresentationState = {
    currentSlide: string;
}

export class PresentationAgent extends Agent<Env, PresentationState> {
    initialState = {
        currentSlide: "first"
    }
}