import { useEffect, useMemo, useState } from 'react';
import { useAgent } from 'agents/react';
import type { PresentationState } from '../../worker/agents/presentation';
import QRCode from '../components/QRCode';
import { slides } from '../slides';
import SlideFrame from '../components/SlideFrame';

export default function PresenterView() {
  const [slideNumber, setSlideNumber] = useState(0);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [showLiveReactions, setShowLiveReactions] = useState(false);
  const agent = useAgent<PresentationState>({
    agent: 'presentation-agent',
    onStateUpdate(state) {
      setSlideNumber(state.currentSlideIndex);
      setReactionCounts(state.reactionCounts ?? {});
      setShowLiveReactions(Boolean(state.showLiveReactions));
    },
  });

  const audienceUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.pathname = '/audience';
    url.search = '';
    url.hash = '';
    return url.toString();
  }, []);

  // Apply current slide index from agent
  useEffect(() => {
    // On initial mount, ensure agent reactions match slide 0
    const meta = slides[0]?.meta;
    if (meta) void agent.stub.setSlide(0, meta.reactions, Boolean(meta.showLiveReactions));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function setByDelta(delta: number) {
      const total = slides.length;
      if (total === 0) return;
      const next = Math.min(Math.max(slideNumber + delta, 0), total - 1);
      const meta = slides[next]?.meta;
      if (meta) void agent.stub.setSlide(next, meta.reactions, Boolean(meta.showLiveReactions));
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setByDelta(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setByDelta(-1);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [agent.stub, slideNumber]);

  const current = slides[slideNumber];

  return (
    <div className="h-screen w-screen">
      {current ? (
        <SlideFrame
          background={current.meta.background}
          overlayBottomRight={
            <div className="flex flex-col items-center gap-3">
              {showLiveReactions && (
                <div className="w-[280px] rounded-xl bg-slate-900/70 backdrop-blur p-3 shadow-lg">
                  <div className="text-xs uppercase tracking-wide text-slate-300/80 mb-2">Live reactions</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(reactionCounts).map(([emoji, count]) => (
                      <div
                        key={emoji}
                        className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-3 py-2 min-w-[72px] justify-center"
                        title={emoji}
                      >
                        <span className="text-2xl leading-none">{emoji}</span>
                        <span className="text-lg font-semibold tabular-nums text-white">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-sm text-slate-200/80">Audience: scan to react</div>
              <QRCode value={audienceUrl} size={180} className="rounded bg-white p-2 shadow-xl" />
            </div>
          }
        >
          <current.Component />
        </SlideFrame>
      ) : (
        <div className="text-slate-400 h-screen w-screen flex items-center justify-center">No slides found</div>
      )}
    </div>
  );
}
