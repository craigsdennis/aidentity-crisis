import { useEffect, useState } from 'react';
import { useAgent } from 'agents/react';
import type { PresentationState } from '../../worker/agents/presentation';

export default function AudienceView() {
  const [reactions, setReactions] = useState<string[]>([]);
  const [justSent, setJustSent] = useState<string | null>(null);
  const agent = useAgent<PresentationState>({
    agent: 'presentation-agent',
    onStateUpdate(state) {
      setReactions(state.availableReactions);
    },
  });

  async function sendReaction(r: string) {
    await agent.stub.storeReaction(r);
    setJustSent(r);
    // clear feedback after short delay
    window.setTimeout(() => setJustSent(null), 800);
  }

  // Ensure we load the latest state when mounting
  useEffect(() => {
    // no-op: useAgent should sync automatically when connected
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 text-slate-100 bg-slate-900">
      <div className="text-xl text-slate-300">Tap to react</div>
      <div className="grid grid-cols-3 gap-6 text-6xl select-none">
        {reactions.map((r) => (
          <button
            key={r}
            className="w-24 h-24 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition"
            onClick={() => void sendReaction(r)}
          >
            <span role="img" aria-label="reaction">
              {r}
            </span>
          </button>
        ))}
      </div>
      {justSent && (
        <div className="px-3 py-1 rounded bg-emerald-700 text-emerald-50">
          Sent {justSent}
        </div>
      )}
    </div>
  );
}

