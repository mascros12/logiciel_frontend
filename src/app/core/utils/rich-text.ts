export interface RichSpan {
  text: string;
  bold: boolean;
}

export interface RichParagraph {
  kind: 'paragraph';
  lines: RichSpan[][];
}

export interface RichTitle {
  kind: 'title';
  spans: RichSpan[];
}

export interface RichList {
  kind: 'list';
  items: RichSpan[][];
}

export type RichBlock = RichParagraph | RichTitle | RichList;

const BULLET = /^[-*•]\s+(.+)$/;

export function parseRichText(value: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  const paragraph: string[] = [];
  const bullets: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ kind: 'paragraph', lines: paragraph.map(spansOf) });
    paragraph.length = 0;
  };
  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push({ kind: 'list', items: bullets.map(spansOf) });
    bullets.length = 0;
  };

  for (const raw of value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushBullets();
      continue;
    }
    if (line.startsWith('# ')) {
      flushParagraph();
      flushBullets();
      const title = line.slice(2).trim();
      if (title) blocks.push({ kind: 'title', spans: spansOf(title) });
      continue;
    }
    const bullet = BULLET.exec(line);
    if (bullet) {
      flushParagraph();
      bullets.push(bullet[1].trim());
      continue;
    }
    flushBullets();
    paragraph.push(line);
  }
  flushParagraph();
  flushBullets();
  return blocks;
}

function spansOf(value: string): RichSpan[] {
  const spans: RichSpan[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) spans.push({ text: value.slice(cursor, start), bold: false });
    if (match[1]) spans.push({ text: match[1], bold: true });
    cursor = start + match[0].length;
  }
  if (cursor < value.length) spans.push({ text: value.slice(cursor), bold: false });
  return spans.length ? spans : [{ text: value, bold: false }];
}

export function applyRichMark(
  value: string,
  start: number,
  end: number,
  kind: 'bold' | 'bullet' | 'title',
): { value: string; caret: number } {
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  if (kind === 'bold') {
    const selected = value.slice(from, to) || 'texto';
    const insert = `**${selected}**`;
    return { value: value.slice(0, from) + insert + value.slice(to), caret: from + insert.length };
  }
  const lineStart = value.lastIndexOf('\n', Math.max(0, from - 1)) + 1;
  const lineEndIndex = value.indexOf('\n', to);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const chunk = value.slice(lineStart, Math.max(to, lineEnd));
  const source = chunk || (kind === 'bullet' ? 'elemento' : 'Título');
  const insert = source.split('\n').map((line) => markLine(line, kind)).join('\n');
  return {
    value: value.slice(0, lineStart) + insert + value.slice(lineEnd),
    caret: lineStart + insert.length,
  };
}

function markLine(line: string, kind: 'bullet' | 'title'): string {
  const trimmed = line.trimStart();
  if (kind === 'bullet') {
    if (trimmed.startsWith('- ') || trimmed.startsWith('# ')) return line;
    return `- ${line}`;
  }
  if (trimmed.startsWith('# ')) return line;
  const text = trimmed.startsWith('- ') ? trimmed.slice(2) : line;
  return `# ${text || 'Título'}`;
}
