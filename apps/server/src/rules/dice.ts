export function d( sides: number, times = 1 ): number[] {
  if (sides < 1 || times < 1) return [];
  return Array.from({ length: times }, () => 1 + Math.floor(Math.random() * sides));
}

export function rollD20(): number {
  return d(20, 1)[0]!;
}

export function rollWithAdvantage(): number {
  const [a, b] = d(20, 2);
  return Math.max(a!, b!);
}

export function rollWithDisadvantage(): number {
  const [a, b] = d(20, 2);
  return Math.min(a!, b!);
}

export function rollDiceNotation(notation: string): { total: number; rolls: number[] } {
  const match = /^(\d*)d(\d+)(?:\s*([+-])\s*(\d+))?$/i.exec(notation.trim());
  if (!match) throw new Error(`Invalid dice notation: ${notation}`);
  const times = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  const rolls = d(sides, times);
  const sign = match[3];
  const modifier = match[4] ? Number(match[4]) : 0;
  const total =
    rolls.reduce((sum, r) => sum + r, 0) + (sign === "-" ? -modifier : modifier);
  return { total, rolls };
}

export function averageResult(notation: string): number {
  const match = /^(\d*)d(\d+)(?:\s*([+-])\s*(\d+))?$/i.exec(notation.trim());
  if (!match) throw new Error(`Invalid dice notation: ${notation}`);
  const times = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  const sign = match[3];
  const modifier = match[4] ? Number(match[4]) : 0;
  const avg = times * ((sides + 1) / 2);
  return Math.floor(avg) + (sign === "-" ? -modifier : modifier);
}
