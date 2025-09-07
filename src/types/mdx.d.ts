declare module '*.mdx' {
  import type { ComponentType } from 'react';
  const MDXComponent: ComponentType<Record<string, unknown>>;
  export default MDXComponent;
  export const meta: Record<string, unknown> | undefined;
}

