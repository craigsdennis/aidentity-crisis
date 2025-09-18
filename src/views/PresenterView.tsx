import { useEffect, useMemo, useRef, useState } from 'react';
import { useAgent } from 'agents/react';
import type { PresentationState } from '../../worker/agents/presentation';
import QRCode from '../components/QRCode';
import { slides } from '../slides';
import SlideFrame from '../components/SlideFrame';

export default function PresenterView() {
  const [slideNumber, setSlideNumber] = useState(0);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [showLiveReactions, setShowLiveReactions] = useState(false);
  // Track how many audio clips have been consumed per slide (fragment-like)
  const [audioProgress, setAudioProgress] = useState<Record<number, number>>({});
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
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
    // Initialize audio progress for slide 0
    setAudioProgress((prev) => ({ ...prev, 0: 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function setByDelta(delta: number) {
      const total = slides.length;
      if (total === 0) return;

      // Helper accessors
      const getClips = (index: number) => slides[index]?.meta?.audioTransitions ?? [];
      const normalizeSrc = (src: string) => (/^https?:\/\//.test(src) || src.startsWith('/') ? src : `/${src}`);
      const stopCurrentAudio = () => {
        const a = currentAudioRef.current;
        if (a) {
          try {
            a.pause();
          } catch {}
          try {
            a.currentTime = 0;
          } catch {}
        }
        currentAudioRef.current = null;
        isPlayingRef.current = false;
      };
      const playClip = (slideIndex: number, clipIndex: number, nextProgressValue: number) => {
        if (isPlayingRef.current) return; // ignore if currently playing
        const clips = getClips(slideIndex);
        const src = clips[clipIndex];
        if (!src) return;
        stopCurrentAudio();
        const audio = new Audio(normalizeSrc(src));
        currentAudioRef.current = audio;
        isPlayingRef.current = true;
        const onEnded = () => {
          isPlayingRef.current = false;
          setAudioProgress((prev) => ({ ...prev, [slideIndex]: nextProgressValue }));
          audio.removeEventListener('ended', onEnded);
          // clean ref only if it's still this audio
          if (currentAudioRef.current === audio) currentAudioRef.current = null;
        };
        audio.addEventListener('ended', onEnded);
        // Start playback; errors (e.g., autoplay restrictions) will leave playing state cleared
        audio.play().catch(() => {
          isPlayingRef.current = false;
          audio.removeEventListener('ended', onEnded);
          if (currentAudioRef.current === audio) currentAudioRef.current = null;
        });
      };

      // If audio is playing, ignore navigation until finished
      if (isPlayingRef.current) return;

      const clips = getClips(slideNumber);
      const progressed = audioProgress[slideNumber] ?? 0;

      if (delta > 0) {
        // Forward: play next clip if available; else advance slide
        if (progressed < clips.length) {
          playClip(slideNumber, progressed, progressed + 1);
          return;
        }
        const next = Math.min(slideNumber + 1, total - 1);
        if (next !== slideNumber) {
          // Stop any current audio and reset playing flag
          stopCurrentAudio();
          // Initialize next slide audio progress to 0 if unset
          setAudioProgress((prev) => (prev[next] == null ? { ...prev, [next]: 0 } : prev));
          const meta = slides[next]?.meta;
          if (meta) void agent.stub.setSlide(next, meta.reactions, Boolean(meta.showLiveReactions));
        }
      } else if (delta < 0) {
        // Backward: if we have progressed clips, step back and play that clip
        if (progressed > 0) {
          playClip(slideNumber, progressed - 1, progressed - 1);
          return;
        }
        const prevIndex = Math.max(slideNumber - 1, 0);
        if (prevIndex !== slideNumber) {
          stopCurrentAudio();
          const prevClips = getClips(prevIndex);
          // Enter previous slide at its last clip progressed (like last fragment)
          setAudioProgress((prev) => ({ ...prev, [prevIndex]: prevClips.length }));
          const meta = slides[prevIndex]?.meta;
          if (meta) void agent.stub.setSlide(prevIndex, meta.reactions, Boolean(meta.showLiveReactions));
        }
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setByDelta(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setByDelta(-1);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [agent.stub, slideNumber, audioProgress]);

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
