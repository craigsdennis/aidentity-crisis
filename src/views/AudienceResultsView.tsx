import { useEffect, useMemo, useState } from 'react';

type Counts = Record<string, Record<string, number>>; // slideIndex -> { emoji -> count }

// Customize: map each emoji to suggested links for the final page
// Update labels/urls to match your content.
const LINKS_BY_EMOJI: Record<string, { label: string; url: string }[]> = {
  '🧡': [
    { label: 'Join the community', url: 'https://community.example.com' },
    { label: 'Subscribe to newsletter', url: 'https://example.com/newsletter' },
  ],
  '😎': [
    { label: 'Advanced docs', url: 'https://example.com/advanced' },
    { label: 'API reference', url: 'https://example.com/api' },
  ],
  '🤷‍♂️': [
    { label: 'FAQs', url: 'https://example.com/faq' },
    { label: 'Getting started', url: 'https://example.com/start' },
  ],
};

// Optional: specific links by slide and emoji.
// Example below shows: if they clicked 🙋 on slide 4 → link to aiavenue.show
// Add or change rules as needed.
const LINKS_BY_SLIDE_EMOJI: Record<string | number, Record<string, { label: string; url: string }[]>> = {
  4: {
    '🙋': [
      { label: 'AI Avenue', url: 'https://aiavenue.show' },
    ],
  },
};

function loadCounts(storageKey = 'audience_reactions'): Counts {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Counts) : {};
  } catch {
    return {};
  }
}

function overallTallies(counts: Counts): Record<string, number> {
  const out: Record<string, number> = {};
  for (const perSlide of Object.values(counts)) {
    for (const [emoji, num] of Object.entries(perSlide)) {
      out[emoji] = (out[emoji] ?? 0) + (num ?? 0);
    }
  }
  return out;
}

function topEntry(map: Record<string, number> | undefined): [string, number] | null {
  if (!map) return null;
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return entries[0] ?? null;
}

export default function AudienceResultsView() {
  const [data, setData] = useState<Counts>({});
  const totalByEmoji = useMemo(() => overallTallies(data), [data]);
  const topOverall = useMemo(() => topEntry(totalByEmoji), [totalByEmoji]);

  useEffect(() => {
    setData(loadCounts());
  }, []);

  const backToAudience = () => {
    const url = new URL(window.location.href);
    url.pathname = '/audience';
    url.search = '';
    url.hash = '';
    window.location.assign(url.toString());
  };

  const clearResults = () => {
    try {
      localStorage.removeItem('audience_reactions');
    } catch {}
    setData({});
  };

  // Links based on top overall emoji
  const globalLinks = topOverall ? LINKS_BY_EMOJI[topOverall[0]] ?? [] : [];

  // Links triggered by specific slide+emoji taps
  const specificLinks = useMemo(() => {
    const out: { label: string; url: string }[] = [];
    for (const [slide, counts] of Object.entries(data)) {
      const rules = LINKS_BY_SLIDE_EMOJI[slide] ?? LINKS_BY_SLIDE_EMOJI[Number(slide) as number];
      if (!rules) continue;
      for (const [emoji, num] of Object.entries(counts)) {
        if ((num ?? 0) > 0 && rules[emoji]) {
          out.push(...rules[emoji]);
        }
      }
    }
    // de-duplicate by URL
    const seen = new Set<string>();
    return out.filter((l) => (seen.has(l.url) ? false : (seen.add(l.url), true)));
  }, [data]);
  const totalReactions = Object.values(totalByEmoji).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Your Results</h1>
            <p className="text-slate-300 mt-1">Personalized links based on your reactions.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm text-sky-300 hover:text-sky-200 underline decoration-dotted" onClick={backToAudience}>
              Back to reactions
            </button>
            <button className="text-sm text-rose-300 hover:text-rose-200 underline decoration-dotted" onClick={clearResults}>
              Reset
            </button>
          </div>
        </header>

        {totalReactions === 0 ? (
          <div className="rounded-xl bg-slate-800/60 p-6">
            <div className="text-slate-200 mb-2">No reactions recorded yet</div>
            <div className="text-slate-400 text-sm">Head back and tap an emoji to see personalized links.</div>
          </div>
        ) : (
          <>
            <section className="rounded-xl bg-slate-800/60 p-6">
              <div className="text-sm uppercase tracking-wide text-slate-300/80 mb-2">Top signal</div>
              {topOverall && (
                <div className="flex items-center gap-4">
                  <div className="text-6xl" title="Top reaction overall">{topOverall[0]}</div>
                  <div className="text-slate-300">
                    <div className="text-lg font-semibold">Most selected reaction</div>
                    <div className="text-sm text-slate-400">{topOverall[1]} of {totalReactions} total reactions</div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl bg-slate-800/60 p-6">
              <div className="text-sm uppercase tracking-wide text-slate-300/80 mb-3">Your links</div>
              {specificLinks.length === 0 && globalLinks.length === 0 ? (
                <div className="text-slate-400 text-sm">No personalized links yet. Try reacting on slides.</div>
              ) : (
                <ul className="list-disc pl-5 space-y-2">
                  {[...specificLinks, ...globalLinks].map((l) => (
                    <li key={l.url}>
                      <a className="text-sky-300 hover:text-sky-200 underline" href={l.url} target="_blank" rel="noreferrer">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl bg-slate-800/60 p-6">
              <div className="text-sm uppercase tracking-wide text-slate-300/80 mb-3">Per-slide breakdown</div>
              <div className="flex flex-col gap-3">
                {Object.entries(data)
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .map(([slide, counts]) => (
                    <div key={slide} className="flex items-center justify-between rounded-lg bg-slate-900/40 p-3">
                      <div className="text-slate-300">Slide {slide}</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(counts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([emoji, count]) => (
                            <div key={emoji} className="flex items-center gap-2 rounded bg-slate-800 px-2 py-1">
                              <span className="text-2xl leading-none">{emoji}</span>
                              <span className="text-sm tabular-nums text-white">{count}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
