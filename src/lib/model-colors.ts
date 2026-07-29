export const MODEL_COLORS: Record<string, string> = {
  Opus: '#D97757',
  Sonnet: '#E89574',
  Haiku: '#B85C43',
  Fable: '#F0B29C',
  'Codex Sol': '#087F68',
  'Codex Terra': '#10A37F',
  'Codex Luna': '#55C6A9',
  'GLM 5.2': '#22d3ee',
};

const SOURCE_COLORS: Record<string, string> = {
  'Claude Code': '#D97757',
  'Claude Desktop': '#E89574',
  Codex: '#10A37F',
  Cursor: '#22d3ee',
  Windsurf: '#34d399',
  Cline: '#f87171',
  'Roo Code': '#fb923c',
  Aider: '#e879f9',
  Continue: '#94a3b8',
  OpenClaw: '#fbbf24',
  Clawdbot: '#fbbf24',
};

const FALLBACK_COLOR = '#94a3b8';

export function modelFamilyFor(model: string): string {
  const value = model.toLowerCase();
  if (value.includes('gpt-5.6-sol') || value.includes('codex sol')) return 'Codex Sol';
  if (value.includes('gpt-5.6-terra') || value.includes('codex terra')) return 'Codex Terra';
  if (value.includes('gpt-5.6-luna') || value.includes('codex luna')) return 'Codex Luna';
  if (value.includes('opus')) return 'Opus';
  if (value.includes('sonnet')) return 'Sonnet';
  if (value.includes('haiku')) return 'Haiku';
  if (value.includes('fable')) return 'Fable';
  if (value.includes('glm')) return 'GLM 5.2';
  return 'Unknown';
}

export function colorForModel(model: string): string {
  return MODEL_COLORS[modelFamilyFor(model)] || FALLBACK_COLOR;
}

export function colorForSource(source: string): string {
  return SOURCE_COLORS[source] || FALLBACK_COLOR;
}

export function shade(hex: string, factor: number): string {
  const value = parseInt(hex.slice(1), 16);
  const target = factor < 0 ? 0 : 255;
  const amount = Math.abs(factor);
  const mix = (channel: number) => Math.round(channel + (target - channel) * amount);
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0');
  return `#${toHex(mix((value >> 16) & 0xff))}${toHex(mix((value >> 8) & 0xff))}${toHex(mix(value & 0xff))}`;
}
