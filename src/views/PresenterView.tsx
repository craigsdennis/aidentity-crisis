import { useEffect, useMemo, useRef, useState } from 'react';
import { useAgent } from 'agents/react';
import type { PresentationState } from '../../worker/agents/presentation';
import QRCode from '../components/QRCode';
import { slides } from '../slides';
import SlideFrame from '../components/SlideFrame';
import { Hand } from '../hand';

export default function PresenterView() {
  const [slideNumber, setSlideNumber] = useState(0);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [showLiveReactions, setShowLiveReactions] = useState(false);
  // Track how many combined audio/action fragments have been consumed per slide
  const [fragmentProgress, setFragmentProgress] = useState<Record<number, number>>({});
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const handRef = useRef<Hand | null>(null);
  const [handSupported, setHandSupported] = useState(() => typeof navigator !== 'undefined' && 'bluetooth' in navigator);
  const [handConnecting, setHandConnecting] = useState(false);
  const [handConnected, setHandConnected] = useState(false);
  const [handError, setHandError] = useState<string | null>(null);
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
    if (meta) {
      void agent.stub.setSlide(0, meta.reactions, {
        showLiveReactions: Boolean(meta.showLiveReactions),
        title: meta.title ?? null,
      });
    }
    // Initialize fragment progress for slide 0
    setFragmentProgress((prev) => ({ ...prev, 0: 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      setHandSupported(true);
    }
    return () => {
      handRef.current?.disconnect();
    };
  }, []);

  const handleConnectHand = async () => {
    if (handConnecting) return;
    if (!handSupported) {
      setHandError('Web Bluetooth is unavailable in this browser.');
      return;
    }
    setHandError(null);
    setHandConnecting(true);
    try {
      const hand = handRef.current ?? new Hand();
      if (!handRef.current) {
        handRef.current = hand;
      }
      const ok = await hand.connect();
      const isConnected = hand.isConnected && ok;
      setHandConnected(isConnected);
      if (!isConnected) {
        setHandError('Failed to connect to hand.');
      }
    } catch (error) {
      console.error(error);
      setHandConnected(false);
      setHandError('Failed to connect to hand.');
    } finally {
      setHandConnecting(false);
    }
  };

  useEffect(() => {
    const getClips = (index: number) => slides[index]?.meta?.audioTransitions ?? [];
    const getHandActions = (index: number): Array<string | number> => slides[index]?.meta?.handActions ?? [];
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

    const triggerHandAction = (rawAction?: string | number) => {
      if (rawAction === undefined || rawAction === null) return;
      const hand = handRef.current;
      if (!hand?.isConnected) return;
      const parsed = typeof rawAction === 'number' ? rawAction : Number.parseInt(rawAction, 10);
      if (!Number.isFinite(parsed)) return;
      void hand.sendCommand(parsed).then((ok) => {
        setHandConnected(hand.isConnected && ok);
        setHandError(ok ? null : 'Failed to send hand command.');
      });
    };

    const playClip = (
      slideIndex: number,
      clipIndex: number,
      nextProgressValue: number,
      nextAction?: string | number,
    ) => {
      if (isPlayingRef.current) return;
      const clips = getClips(slideIndex);
      const src = clips[clipIndex];
      if (!src) return;
      stopCurrentAudio();
      const audio = new Audio(normalizeSrc(src));
      currentAudioRef.current = audio;
      isPlayingRef.current = true;
      if (nextAction !== undefined && nextAction !== null) triggerHandAction(nextAction);
      const onEnded = () => {
        isPlayingRef.current = false;
        setFragmentProgress((prev) => ({ ...prev, [slideIndex]: nextProgressValue }));
        audio.removeEventListener('ended', onEnded);
        if (currentAudioRef.current === audio) currentAudioRef.current = null;
      };
      audio.addEventListener('ended', onEnded);
      audio.play().catch(() => {
        isPlayingRef.current = false;
        audio.removeEventListener('ended', onEnded);
        if (currentAudioRef.current === audio) currentAudioRef.current = null;
      });
    };

    const setByDelta = (delta: number) => {
      const total = slides.length;
      if (total === 0) return;
      if (isPlayingRef.current) return;

      const clips = getClips(slideNumber);
      const actions = getHandActions(slideNumber);
      const progressed = fragmentProgress[slideNumber] ?? 0;
      const totalFragments = Math.max(clips.length, actions.length);

      if (delta > 0) {
        if (progressed < totalFragments) {
          const fragmentIndex = progressed;
          const actionForStep = actions[fragmentIndex];
          const clipForStep = clips[fragmentIndex];
          if (clipForStep) {
            playClip(slideNumber, fragmentIndex, progressed + 1, actionForStep);
          } else {
            if (actionForStep !== undefined && actionForStep !== null) triggerHandAction(actionForStep);
            setFragmentProgress((prev) => ({ ...prev, [slideNumber]: progressed + 1 }));
          }
          return;
        }
        const next = Math.min(slideNumber + 1, total - 1);
        if (next !== slideNumber) {
          stopCurrentAudio();
          setFragmentProgress((prev) => (prev[next] == null ? { ...prev, [next]: 0 } : prev));
          const meta = slides[next]?.meta;
          if (meta) {
            void agent.stub.setSlide(next, meta.reactions, {
              showLiveReactions: Boolean(meta.showLiveReactions),
              title: meta.title ?? null,
            });
          }
        }
      } else if (delta < 0) {
        if (progressed > 0) {
          const fragmentIndex = progressed - 1;
          const actionForStep = actions[fragmentIndex];
          const clipForStep = clips[fragmentIndex];
          if (clipForStep) {
            playClip(slideNumber, fragmentIndex, fragmentIndex, actionForStep);
          } else {
            if (actionForStep !== undefined && actionForStep !== null) triggerHandAction(actionForStep);
            setFragmentProgress((prev) => ({ ...prev, [slideNumber]: fragmentIndex }));
          }
          return;
        }
        const prevIndex = Math.max(slideNumber - 1, 0);
        if (prevIndex !== slideNumber) {
          stopCurrentAudio();
          const prevClips = getClips(prevIndex);
          const prevActions = getHandActions(prevIndex);
          setFragmentProgress((prev) => ({
            ...prev,
            [prevIndex]: Math.max(prevClips.length, prevActions.length),
          }));
          const meta = slides[prevIndex]?.meta;
          if (meta) {
            void agent.stub.setSlide(prevIndex, meta.reactions, {
              showLiveReactions: Boolean(meta.showLiveReactions),
              title: meta.title ?? null,
            });
          }
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setByDelta(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setByDelta(-1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [agent.stub, slideNumber, fragmentProgress]);

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
              {handSupported ? (
                !handConnected && (
                  <button
                    type="button"
                    onClick={handleConnectHand}
                    disabled={handConnecting}
                    className="flex items-center justify-center rounded-lg bg-slate-800/80 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-slate-700/80 disabled:cursor-default disabled:opacity-60"
                  >
                    {handConnecting ? 'Connecting hand...' : 'Connect hand'}
                  </button>
                )
              ) : (
                <div className="text-xs text-slate-300/80">Web Bluetooth not supported</div>
              )}
              {handError && (
                <div className="text-xs text-rose-300/80 text-center max-w-[220px]">{handError}</div>
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
