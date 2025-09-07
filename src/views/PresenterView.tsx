import { useEffect, useMemo, useState } from 'react';
import { useAgent } from 'agents/react';
import type { PresentationState } from '../../worker/agents/presentation';
import QRCode from '../components/QRCode';

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        // advance slide
        void agent.stub.nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        // go back a slide
        void agent.stub.prevSlide();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [agent.stub]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 text-slate-100 bg-slate-900">
      <div className="text-5xl font-semibold">Slide {slideNumber}</div>
      <div className="flex gap-4">
        <button
          className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600"
          onClick={() => agent.stub.prevSlide()}
        >
          ← Prev
        </button>
        <button
          className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500"
          onClick={() => agent.stub.nextSlide()}
        >
          Next →
        </button>
      </div>

      <div className="mt-10 flex flex-col items-center gap-2">
        <div className="text-lg text-slate-300">Audience: scan to react</div>
        <QRCode value={audienceUrl} size={256} className="rounded bg-white p-2" />
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

