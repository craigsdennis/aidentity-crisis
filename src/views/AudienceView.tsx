import { useEffect, useMemo, useState } from 'react';
import { useAgent } from 'agents/react';
import type { PresentationState } from '../../worker/agents/presentation';
import MarkdownText from '../components/MarkdownText';

export default function AudienceView() {
  const [reactions, setReactions] = useState<string[]>([]);
  const [justSent, setJustSent] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const [title, setTitle] = useState<string | null>(null);
  const agent = useAgent<PresentationState>({
    agent: 'presentation-agent',
    onStateUpdate(state) {
      setReactions(state.currentSlide?.availableReactions ?? []);
      setSlideIndex(state.currentSlideIndex ?? 0);
      setTitle(state.currentSlide?.title ?? null);
    },
  });

  // LocalStorage helpers for per-slide reaction counts
  const storageKey = useMemo(() => 'audience_reactions', []);
  function loadCounts(): Record<string, Record<string, number>> {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Record<string, Record<string, number>>) : {};
    } catch {
      return {};
    }
  }
  function saveCounts(data: Record<string, Record<string, number>>) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // ignore write errors (e.g., storage full/private mode)
    }
  }

  async function sendReaction(r: string) {
    await agent.stub.storeReaction(r);
    setJustSent(r);
    // Persist locally: increment count for this slide + emoji
    try {
      const all = loadCounts();
      const key = String(slideIndex ?? 0);
      const perSlide = all[key] ?? {};
      perSlide[r] = (perSlide[r] ?? 0) + 1;
      all[key] = perSlide;
      saveCounts(all);
    } catch {
      // ignore storage failures
    }
    // clear feedback after short delay
    window.setTimeout(() => setJustSent(null), 800);
  }

  // Ensure we load the latest state when mounting
  useEffect(() => {
    // no-op: useAgent should sync automatically when connected
  }, []);

  const hasTitle = typeof title === 'string' && title.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 text-slate-100 bg-slate-900">
      {hasTitle && (
        <MarkdownText
          markdown={title}
          className="flex flex-col gap-2 text-center text-slate-50 max-w-3xl leading-tight"
        />
      )}
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
