import { useEffect, useMemo, useState } from 'react';
import { useAgent } from 'agents/react';
import type { PresentationState } from '../../worker/agents/presentation';
import QRCode from '../components/QRCode';
import { slides } from '../slides';
import SlideFrame from '../components/SlideFrame';

export default function PresenterView() {
  const [slideNumber, setSlideNumber] = useState(0);
  const agent = useAgent<PresentationState>({
    agent: 'presentation-agent',
    onStateUpdate(state) {
      setSlideNumber(state.currentSlideIndex);
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
    if (meta) void agent.stub.setSlide(0, meta.reactions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function setByDelta(delta: number) {
      const total = slides.length;
      if (total === 0) return;
      const next = Math.min(Math.max(slideNumber + delta, 0), total - 1);
      const meta = slides[next]?.meta;
      if (meta) void agent.stub.setSlide(next, meta.reactions);
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

  const total = slides.length;
  const current = slides[slideNumber];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-slate-100 bg-slate-900">
      <div className="w-full max-w-[1200px] flex items-center justify-between">
        <div className="text-2xl font-semibold">Slide {slideNumber + 1} / {total}</div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600"
            onClick={() => {
              const next = Math.max(0, slideNumber - 1);
              const meta = slides[next]?.meta;
              if (meta) void agent.stub.setSlide(next, meta.reactions);
            }}
          >
            ← Prev
          </button>
          <button
            className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500"
            onClick={() => {
              const next = Math.min(total - 1, slideNumber + 1);
              const meta = slides[next]?.meta;
              if (meta) void agent.stub.setSlide(next, meta.reactions);
            }}
          >
            Next →
          </button>
        </div>
      </div>

      {current ? (
        <SlideFrame background={current.meta.background}>
          <current.Component />
        </SlideFrame>
      ) : (
        <div className="text-slate-400">No slides found</div>
      )}

      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="text-lg text-slate-300">Audience: scan to react</div>
        <QRCode value={audienceUrl} size={220} className="rounded bg-white p-2" />
        <a
          href={audienceUrl}
          className="text-sm text-indigo-300 hover:underline break-all"
        >
          {audienceUrl}
        </a>
      </div>
      <div className="text-xs text-slate-500">Use left/right arrows or buttons</div>
    </div>
  );
}
