import React from 'react';

interface FormattedTextProps {
  text?: string;
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  '0': '#000000',
  '1': '#0000aa',
  '2': '#00aa00',
  '3': '#00aaaa',
  '4': '#aa0000',
  '5': '#aa00aa',
  '6': '#ffaa00',
  '7': '#aaaaaa',
  '8': '#555555',
  '9': '#5555ff',
  'a': '#55ff55',
  'b': '#55ffff',
  'c': '#ff5555',
  'd': '#ff55ff',
  'e': '#ffff55',
  'f': '#ffffff',
};

export const FormattedText: React.FC<FormattedTextProps> = ({ text = '', className = '' }) => {
  if (!text) return null;

  // Split by legacy formatting or hex codes
  const tokens: React.ReactNode[] = [];
  let currentColor = '#ffffff';
  let isBold = false;
  let isItalic = false;
  let isUnderlined = false;
  let isStrikethrough = false;

  let i = 0;
  let buffer = '';

  const flushBuffer = (key: string) => {
    if (!buffer) return;
    tokens.push(
      <span
        key={key}
        style={{
          color: currentColor,
          fontWeight: isBold ? 'bold' : 'normal',
          fontStyle: isItalic ? 'italic' : 'normal',
          textDecoration: `${isUnderlined ? 'underline' : ''} ${isStrikethrough ? 'line-through' : ''}`.trim() || undefined,
        }}
      >
        {buffer}
      </span>
    );
    buffer = '';
  };

  while (i < text.length) {
    const char = text[i];

    if ((char === '&' || char === '§') && i + 1 < text.length) {
      const code = text[i + 1].toLowerCase();

      // Hex support: &#RRGGBB
      if (code === '#' && i + 7 < text.length) {
        flushBuffer(`token-${i}`);
        currentColor = `#${text.substring(i + 2, i + 8)}`;
        i += 8;
        continue;
      }

      if (COLOR_MAP[code]) {
        flushBuffer(`token-${i}`);
        currentColor = COLOR_MAP[code];
        isBold = false;
        isItalic = false;
        isUnderlined = false;
        isStrikethrough = false;
        i += 2;
        continue;
      } else if (code === 'l') {
        flushBuffer(`token-${i}`);
        isBold = true;
        i += 2;
        continue;
      } else if (code === 'o') {
        flushBuffer(`token-${i}`);
        isItalic = true;
        i += 2;
        continue;
      } else if (code === 'n') {
        flushBuffer(`token-${i}`);
        isUnderlined = true;
        i += 2;
        continue;
      } else if (code === 'm') {
        flushBuffer(`token-${i}`);
        isStrikethrough = true;
        i += 2;
        continue;
      } else if (code === 'r') {
        flushBuffer(`token-${i}`);
        currentColor = '#ffffff';
        isBold = false;
        isItalic = false;
        isUnderlined = false;
        isStrikethrough = false;
        i += 2;
        continue;
      }
    }

    buffer += char;
    i++;
  }

  flushBuffer(`token-${i}`);

  return <span className={`inline-flex items-center flex-wrap ${className}`}>{tokens}</span>;
};
