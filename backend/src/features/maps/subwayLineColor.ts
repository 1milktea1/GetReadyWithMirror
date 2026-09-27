// Official MTA trunk colors. Used when a live router names a line but omits a hex.

const MTA_LINE_COLORS: Record<string, string> = {
  1: '#EE352E',
  2: '#EE352E',
  3: '#EE352E',
  4: '#00933C',
  5: '#00933C',
  6: '#00933C',
  '6X': '#00933C',
  7: '#B933AD',
  '7X': '#B933AD',
  A: '#0039A6',
  C: '#0039A6',
  E: '#0039A6',
  H: '#0039A6',
  B: '#FF6319',
  D: '#FF6319',
  F: '#FF6319',
  M: '#FF6319',
  G: '#6CBE45',
  J: '#996633',
  Z: '#996633',
  L: '#A7A9AC',
  N: '#FCCC0A',
  Q: '#FCCC0A',
  R: '#FCCC0A',
  W: '#FCCC0A',
  S: '#808183',
  GS: '#808183',
  FS: '#808183',
  SIR: '#0078C6',
};

const WALK_COLOR = '#8A8A8A';

export function subwayLineColor(line: string, provided?: string): string {
  const hex = normalizeHex(provided);
  if (hex) return hex;
  return MTA_LINE_COLORS[line.trim().toUpperCase()] ?? '#FFFFFF';
}

export function walkLegColor(): string {
  return WALK_COLOR;
}

function normalizeHex(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const hex = value.trim().replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return undefined;
  return `#${hex.toUpperCase()}`;
}
