import type { ComponentType } from 'react';

export type SlideMeta = {
  title?: string;
  reactions?: string[];
  background?: string;
  // Opt-in: show live reaction counters on this slide
  showLiveReactions?: boolean;
  // Optional per-slide audio transition clips (served from /public)
  audioTransitions?: string[];
};

export type SlideModule = {
  default: ComponentType;
  meta?: SlideMeta;
};

export type Slide = {
  id: string;
  Component: ComponentType;
  meta: Required<Pick<SlideMeta, 'reactions'>> & SlideMeta;
};

const modules = import.meta.glob<SlideModule>('./**/*.mdx', { eager: true });

function sortByPath([a]: [string, SlideModule], [b]: [string, SlideModule]) {
  return a.localeCompare(b);
}

export const slides: Slide[] = Object.entries(modules)
  // ignore any MDX file whose basename starts with an underscore
  .filter(([path]) => {
    const base = path.split('/').pop() || path;
    return !base.startsWith('_');
  })
  .sort(sortByPath)
  .map(([path, mod]) => {
    const meta: SlideMeta = mod.meta ?? {};
    return {
      id: path,
      Component: mod.default,
      meta: {
        reactions: meta.reactions ?? ['🧡', '😎', '🤷‍♂️'],
        ...meta,
      },
    } satisfies Slide;
  });
