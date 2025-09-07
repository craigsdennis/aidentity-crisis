import { useState } from 'react'
import './App.css'
import { useAgent } from 'agents/react'
import type {PresentationAgent, PresentationState} from '../worker/agents/presentation';

function App() {
  const [slideNumber, setSlideNumber] = useState(0)
  const agent = useAgent<PresentationState>({
    agent: "presentation-agent",
    onStateUpdate(state) {
      setSlideNumber(state.currentSlideIndex);
    }
  });
  async function advanceSlide() {
    await agent.stub.nextSlide();
  }
  return (
    <>
    Slide: {slideNumber}
    <button onClick={advanceSlide}>Next Slide</button>
    </>
  )
}

export default App
