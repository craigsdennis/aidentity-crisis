type MarkdownTextProps = {
  markdown?: string | null;
  className?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInline(raw: string): string {
  let result = raw
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  result = result.replace(/(^|[^*])\*(?!\*)([^*]+?)\*(?!\*)/g, (_match, prefix: string, value: string) => `${prefix}<em>${value}</em>`);
  result = result.replace(/(^|[^_])_(?!_)([^_]+?)_(?!_)/g, (_match, prefix: string, value: string) => `${prefix}<em>${value}</em>`);
  return result;
}

function toHtml(markdown: string): string {
  const headingClasses: Record<number, string> = {
    1: 'text-4xl font-semibold',
    2: 'text-3xl font-semibold',
    3: 'text-2xl font-semibold',
    4: 'text-xl font-semibold',
    5: 'text-lg font-semibold',
    6: 'text-base font-semibold',
  };
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = Math.min(heading[1].length, 6);
        const content = formatInline(escapeHtml(heading[2] ?? ''));
        const classes = headingClasses[level] ?? headingClasses[3];
        return `<h${level} class="${classes}">${content}</h${level}>`;
      }
      const content = formatInline(escapeHtml(line));
      return `<p class="text-2xl font-semibold">${content}</p>`;
    })
    .join('');
}

export default function MarkdownText({ markdown, className }: MarkdownTextProps) {
  if (!markdown) return null;
  const html = toHtml(markdown);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
