export interface RichSpan {
  text: string;
  bold: boolean;
  underline: boolean;
  color: 'red' | 'purple' | null;
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

export interface RichGap {
  kind: 'gap';
  lines: number;
}

export type RichBlock = RichParagraph | RichTitle | RichList | RichGap;

const BULLET = /^[-*•]\s+(.+)$/;

export function parseRichText(value: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  const paragraph: string[] = [];
  const bullets: string[] = [];
  let gaps = 0;

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
  const flushGaps = () => {
    if (!gaps) return;
    blocks.push({ kind: 'gap', lines: gaps });
    gaps = 0;
  };

  for (const raw of value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushBullets();
      gaps += 1;
      continue;
    }
    flushGaps();
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
  flushGaps();
  return blocks;
}

function spansOf(value: string): RichSpan[] {
  const spans: RichSpan[] = [];
  const marks = /\*\*|\[\/?(?:u|rojo|morado)\]/gi;
  let bold = false;
  let underline = 0;
  const colors: Array<'red' | 'purple'> = [];
  let cursor = 0;

  const push = (text: string) => {
    if (!text) return;
    spans.push({
      text,
      bold,
      underline: underline > 0,
      color: colors.length ? colors[colors.length - 1] : null,
    });
  };
  const closeColor = (name: 'red' | 'purple') => {
    for (let index = colors.length - 1; index >= 0; index -= 1) {
      if (colors[index] === name) {
        colors.splice(index, 1);
        return;
      }
    }
  };

  for (const match of value.matchAll(marks)) {
    const start = match.index ?? 0;
    push(value.slice(cursor, start));
    const token = match[0].toLowerCase();
    if (token === '**') bold = !bold;
    else if (token === '[u]') underline += 1;
    else if (token === '[/u]') underline = Math.max(0, underline - 1);
    else if (token === '[rojo]') colors.push('red');
    else if (token === '[morado]') colors.push('purple');
    else if (token === '[/rojo]') closeColor('red');
    else if (token === '[/morado]') closeColor('purple');
    cursor = start + match[0].length;
  }
  push(value.slice(cursor));
  return spans.length ? spans : [{ text: value, bold: false, underline: false, color: null }];
}

const WRAP: Record<'bold' | 'underline' | 'red' | 'purple', [string, string]> = {
  bold: ['**', '**'],
  underline: ['[u]', '[/u]'],
  red: ['[rojo]', '[/rojo]'],
  purple: ['[morado]', '[/morado]'],
};

export function applyRichMark(
  value: string,
  start: number,
  end: number,
  kind: 'bold' | 'underline' | 'red' | 'purple' | 'bullet' | 'title',
): { value: string; caret: number } {
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  if (kind !== 'bullet' && kind !== 'title') {
    return toggleWrap(value, from, to, WRAP[kind][0], WRAP[kind][1]);
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

function toggleWrap(
  value: string,
  from: number,
  to: number,
  open: string,
  close: string,
): { value: string; caret: number } {
  if (from === to) {
    const insert = `${open}texto${close}`;
    return { value: value.slice(0, from) + insert + value.slice(to), caret: from + insert.length };
  }
  const selected = value.slice(from, to);
  const wrapsSelection = selected.startsWith(open)
    && selected.endsWith(close)
    && selected.length > open.length + close.length;
  if (wrapsSelection) {
    const inner = selected.slice(open.length, selected.length - close.length);
    return { value: value.slice(0, from) + inner + value.slice(to), caret: from + inner.length };
  }
  const around = from >= open.length
    && value.slice(from - open.length, from) === open
    && value.slice(to, to + close.length) === close;
  if (around) {
    const next = value.slice(0, from - open.length) + selected + value.slice(to + close.length);
    return { value: next, caret: from - open.length + selected.length };
  }
  const insert = open + selected + close;
  return { value: value.slice(0, from) + insert + value.slice(to), caret: from + insert.length };
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
