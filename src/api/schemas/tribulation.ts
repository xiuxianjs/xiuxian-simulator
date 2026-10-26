import { parseDisruptionSummary } from './public-tribulation';
export type TribulationGrade = 'low' | 'standard' | 'high';
export type TribulationProgress = { successful: number; requiredAttempts: number; attackBonusPercent: number; completed: boolean };
export type TribulationEvasion = { policyVersion: string; level: number; npcAttackBonusPercent: number; recoversAt?: string };
export type TribulationEvasionPreview = { nextLevel: number; nextAttackBonusPercent: number; resetAfterSeconds: number };
export type TribulationEvasionResult = { eventId: number; status: 'evaded'; levelAfter: number; recoversAt: string; retryAt: string };
export function parseTribulationEvasion(value: unknown): TribulationEvasion {
  const e = value as TribulationEvasion;

  if (
    !e ||
    !/^[a-f0-9]{64}$/.test(e.policyVersion) ||
    !Number.isSafeInteger(e.level) ||
    e.level < 0 ||
    !Number.isFinite(e.npcAttackBonusPercent) ||
    e.npcAttackBonusPercent < 0 ||
    (e.recoversAt !== undefined && !Number.isFinite(Date.parse(e.recoversAt)))
  ) {
    throw new Error('暂避档位数据不完整');
  }

  return e;
}
export function parseTribulationEvasionResult(value: unknown): TribulationEvasionResult {
  const e = value as TribulationEvasionResult;

  if (
    e?.status !== 'evaded' ||
    !Number.isSafeInteger(e.eventId) ||
    e.eventId < 1 ||
    !Number.isSafeInteger(e.levelAfter) ||
    e.levelAfter < 1 ||
    ![e.recoversAt, e.retryAt].every(t => typeof t === 'string' && Number.isFinite(Date.parse(t)))
  ) {
    throw new Error('暂避结果不完整，请按原事件重试');
  }

  return e;
}
export type TribulationHeartChoice = 'guard' | 'slay' | 'accept';
export type TribulationHeartOption = { id: TribulationHeartChoice; name: string; attackMultiplier: number; defenseMultiplier: number };
export type TribulationHeartDemon = {
  policyVersion: string;
  topic: 'failure' | 'evasion' | 'disruption' | 'general';
  title: string;
  prompt: string;
  sourceEventId?: number;
  choice?: TribulationHeartChoice;
  answeredAt?: string;
  options: TribulationHeartOption[];
};
export function parseTribulationHeartDemon(value: unknown): TribulationHeartDemon {
  const h = value as TribulationHeartDemon;

  if (
    !h ||
    typeof h !== 'object' ||
    !/^[a-f0-9]{64}$/.test(h.policyVersion) ||
    !['failure', 'evasion', 'disruption', 'general'].includes(h.topic) ||
    typeof h.title !== 'string' ||
    !h.title.trim() ||
    typeof h.prompt !== 'string' ||
    !h.prompt.trim() ||
    !Array.isArray(h.options) ||
    h.options.length !== 3 ||
    new Set(h.options.map(o => o?.id)).size !== 3 ||
    (h.sourceEventId !== undefined && (!Number.isSafeInteger(h.sourceEventId) || h.sourceEventId < 1))
  ) {
    throw new Error('心魔内容不完整');
  }
  for (const o of h.options) {
    if (
      !o ||
      typeof o.name !== 'string' ||
      !o.name.trim() ||
      ![o.attackMultiplier, o.defenseMultiplier].every(n => Number.isFinite(n) && n > 0) ||
      !['guard', 'slay', 'accept'].includes(o.id) ||
      (o.id === 'guard' && !(o.attackMultiplier < 1 && o.defenseMultiplier > 1)) ||
      (o.id === 'slay' && !(o.attackMultiplier > 1 && o.defenseMultiplier < 1)) ||
      (o.id === 'accept' && !(o.attackMultiplier === 1 && o.defenseMultiplier === 1))
    ) {
      throw new Error('心魔效果不完整');
    }
  }
  if (
    (h.choice !== undefined && !h.options.some(o => o.id === h.choice)) ||
    Boolean(h.choice) !== Boolean(h.answeredAt) ||
    (h.answeredAt !== undefined && (typeof h.answeredAt !== 'string' || !Number.isFinite(Date.parse(h.answeredAt))))
  ) {
    throw new Error('心魔回答状态不完整');
  }

  return h;
}
export type TribulationPreparation = {
  eventId: number;
  targetRealm: string;
  status: string;
  opensAt?: string;
  deadline?: string;
  retryAt?: string;
  canOpen?: boolean;
  materials?: { itemId: number; itemName: string; requiredQuantity: number; currentQuantity: number; sufficient: boolean }[];
  recoveryEndsAt?: string;
  earliestRetryAt?: string;
  strikeAt?: string;
  requiredAttempts: number;
  canStart: boolean;
  canAnswerHeartDemon?: boolean;
  heartDemon?: TribulationHeartDemon;
  canEvade?: boolean;
  evasion?: TribulationEvasion;
  evasionPreview?: TribulationEvasionPreview;
  qualityProgress?: TribulationProgress;
  gradeOptions?: { grade: TribulationGrade; attackMultiplier: number; attackBonusPercent: number }[];
};
export type TribulationInput = { grade: TribulationGrade; attackMultiplier: number; conditionVersion: string };
export type TribulationUnit = {
  Name: string;
  HP: number;
  MP: number;
  PhysicalAttack: number;
  MagicAttack: number;
  PhysicalDefense: number;
  MagicDefense: number;
  Speed: number;
};
export type TribulationWeather = {
  id: string;
  name: string;
  startsAt: string;
  changesAt: string;
  npc: Partial<
    Record<
      'physicalAttackMultiplier' | 'magicAttackMultiplier' | 'physicalDefenseMultiplier' | 'magicDefenseMultiplier' | 'speedMultiplier' | 'critRatePoints',
      number
    >
  >;
  changes: Array<{
    layer: number;
    position: number;
    attribute: 'physicalAttack' | 'magicAttack' | 'physicalDefense' | 'magicDefense' | 'speed' | 'critRate';
    before: number;
    after: number;
  }>;
};
export type TribulationKarma = {
  policyVersion: string;
  capturedAt: string;
  currentShaQi: number;
  shaQiAttackBonusPercent: number;
  activeDisruptions: number;
  disruptionAttackBonusPercent: number;
  npcAttackBonusPercent: number;
};
export function parseTribulationKarma(data: unknown): TribulationKarma {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('渡劫因果数据不完整');
  }
  const value = data as TribulationKarma;

  if (
    !/^[a-f0-9]{64}$/.test(value.policyVersion) ||
    typeof value.capturedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.capturedAt)) ||
    ![value.currentShaQi, value.activeDisruptions].every(n => Number.isSafeInteger(n) && n >= 0) ||
    ![value.shaQiAttackBonusPercent, value.disruptionAttackBonusPercent, value.npcAttackBonusPercent].every(n => Number.isFinite(n) && n >= 0) ||
    value.npcAttackBonusPercent > value.shaQiAttackBonusPercent + value.disruptionAttackBonusPercent
  ) {
    throw new Error('渡劫因果数据不完整');
  }

  return value;
}
export type TribulationAttackLimit = {
  maxMultiplier: number;
  changes: Array<{ layer: number; position: number; attribute: 'physicalAttack' | 'magicAttack'; base: number; before: number; after: number }>;
};
export function parseTribulationAttackLimit(data: unknown): TribulationAttackLimit {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('雷劫总攻击上限数据不完整');
  }
  const value = data as TribulationAttackLimit;

  if (!Number.isFinite(value.maxMultiplier) || value.maxMultiplier <= 0 || !Array.isArray(value.changes)) {
    throw new Error('雷劫总攻击上限数据不完整');
  }
  const seen = new Set<string>();

  for (const c of value.changes) {
    if (
      !c ||
      ![c.layer, c.position].every(n => Number.isSafeInteger(n) && n > 0) ||
      !['physicalAttack', 'magicAttack'].includes(c.attribute) ||
      ![c.base, c.before, c.after].every(n => Number.isSafeInteger(n) && n >= 0) ||
      c.before <= c.after ||
      c.after !== Math.floor(c.base * value.maxMultiplier)
    ) {
      throw new Error('雷劫总攻击上限数据不完整');
    }
    const key = `${c.layer}:${c.position}:${c.attribute}`;

    if (seen.has(key)) {
      throw new Error('雷劫总攻击上限数据不完整');
    }
    seen.add(key);
  }

  return value;
}
export type TribulationConfirmation = TribulationInput & {
  eventId: number;
  npcConfigVersion?: string;
  attackLimit?: TribulationAttackLimit;
  heartDemon?: TribulationHeartDemon;
  evasion?: TribulationEvasion;
  karma?: TribulationKarma;
  weather?: TribulationWeather;
  disruption?: { count: number; attackBonusPercent: number };
  rewardScope: 'current' | 'cumulative';
  experienceBefore: number;
  successExperienceCost: number;
  failureExperienceAfter: number;
  progress: TribulationProgress;
  materials: { itemId: number; quantity: number }[];
  battle: { mode?: string; name: string; player: TribulationUnit; layers: { layer: number; enemies: TribulationUnit[] }[] };
};
export type TribulationCharging = {
  eventId: number;
  status: 'charging' | 'cancelled' | 'succeeded' | 'failed';
  grade: TribulationGrade;
  attackMultiplier: number;
  conditionVersion: string;
  confirmedAt: string;
  strikeAt: string;
  refunded: boolean;
  cancelledReason?: string;
};
export type TribulationReceipt = {
  eventId: number;
  grade: TribulationGrade;
  success: boolean;
  promoted: boolean;
  experienceBefore: number;
  experienceAfter: number;
  progress: TribulationProgress;
  materials: { itemId: number; itemName: string; requiredQuantity: number }[];
  battle: { name: string; summary: string; totalLayers: number; passedLayers: number };
  debuff?: { applied: boolean; expiresAt: string };
  conditions?: {
    attackLimit?: TribulationAttackLimit;
    heartDemon?: TribulationHeartDemon;
    evasion?: TribulationEvasion;
    karma?: TribulationKarma;
    weather?: TribulationWeather;
    disruption?: { count: number; attackBonusPercent: number };
  };
};

function requireValue(valid: boolean): asserts valid {
  if (!valid) {
    throw new Error('渡劫接口返回不完整，请更新服务端后重试');
  }
}
function record(value: unknown): Record<string, unknown> {
  requireValue(Boolean(value) && typeof value === 'object' && !Array.isArray(value));

  return value as Record<string, unknown>;
}
function numeric(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
function id(value: unknown): value is number {
  return numeric(value) && Number.isSafeInteger(value) && value > 0;
}
export function isTribulationGrade(value: unknown): value is TribulationGrade {
  return typeof value === 'string' && ['low', 'standard', 'high'].includes(value);
}
function progress(value: unknown) {
  const p = record(value);

  requireValue(
    numeric(p.successful) &&
      Number.isInteger(p.successful) &&
      p.successful >= 0 &&
      id(p.requiredAttempts) &&
      p.successful <= p.requiredAttempts &&
      numeric(p.attackBonusPercent) &&
      typeof p.completed === 'boolean'
  );
}
export function parseTribulationPreparation(value: unknown): TribulationPreparation {
  const p = record(value);

  requireValue(
    id(p.eventId) &&
      typeof p.targetRealm === 'string' &&
      typeof p.status === 'string' &&
      ['ready', 'opened', 'scheduled', 'preparing', 'charging', 'succeeded', 'failed', 'expired', 'cancelled', 'evaded'].includes(p.status) &&
      id(p.requiredAttempts) &&
      typeof p.canStart === 'boolean'
  );
  for (const field of p.status === 'ready' ? [] : p.status === 'opened' ? ['opensAt'] : ['opensAt', 'deadline', 'retryAt']) {
    requireValue(typeof p[field] === 'string' && Number.isFinite(Date.parse(p[field])));
  }
  if (p.canOpen !== undefined) {
    requireValue(typeof p.canOpen === 'boolean' && (!p.canOpen || p.status === 'ready'));
  }
  if (p.materials !== undefined) {
    requireValue(Array.isArray(p.materials));
    for (const material of p.materials as unknown[]) {
      const m = record(material);

      requireValue(
        id(m.itemId) &&
          typeof m.itemName === 'string' &&
          Number.isSafeInteger(m.requiredQuantity) &&
          Number.isSafeInteger(m.currentQuantity) &&
          typeof m.sufficient === 'boolean'
      );
    }
  }
  if (p.recoveryEndsAt !== undefined || p.earliestRetryAt !== undefined) {
    requireValue(typeof p.recoveryEndsAt === 'string' && Number.isFinite(Date.parse(p.recoveryEndsAt)));
    requireValue(typeof p.earliestRetryAt === 'string' && Number.isFinite(Date.parse(p.earliestRetryAt)));
    requireValue(Date.parse(p.earliestRetryAt) === Math.max(Date.parse(p.retryAt as string), Date.parse(p.recoveryEndsAt)));
  }
  if (p.heartDemon !== undefined) {
    parseTribulationHeartDemon(p.heartDemon);
  }
  if (p.canAnswerHeartDemon !== undefined) {
    requireValue(typeof p.canAnswerHeartDemon === 'boolean');
  }
  if (p.canAnswerHeartDemon) {
    requireValue(p.status === 'opened' && p.heartDemon !== undefined && !record(p.heartDemon).choice);
  }
  if (p.evasion !== undefined) {
    parseTribulationEvasion(p.evasion);
  }
  if (p.canEvade !== undefined) {
    requireValue(typeof p.canEvade === 'boolean');
  }
  if (p.canEvade) {
    const next = record(p.evasionPreview);

    requireValue(
      p.status === 'opened' && id(next.nextLevel) && numeric(next.nextAttackBonusPercent) && next.nextAttackBonusPercent >= 0 && id(next.resetAfterSeconds)
    );
  }
  if (p.qualityProgress !== undefined) {
    progress(p.qualityProgress);
  }
  if (p.gradeOptions !== undefined) {
    requireValue(Array.isArray(p.gradeOptions));
    for (const option of p.gradeOptions as unknown[]) {
      const g = record(option);

      requireValue(isTribulationGrade(g.grade) && numeric(g.attackMultiplier) && g.attackMultiplier > 0 && numeric(g.attackBonusPercent));
    }
  }

  return p as TribulationPreparation;
}
function unit(value: unknown) {
  const u = record(value);

  requireValue(
    typeof u.Name === 'string' && ['HP', 'MP', 'PhysicalAttack', 'MagicAttack', 'PhysicalDefense', 'MagicDefense', 'Speed'].every(key => numeric(u[key]))
  );
}
function weather(value: unknown) {
  const w = record(value);

  requireValue(typeof w.id === 'string' && Boolean(w.id.trim()) && typeof w.name === 'string' && Boolean(w.name.trim()));
  for (const key of ['startsAt', 'changesAt']) {
    requireValue(typeof w[key] === 'string' && Number.isFinite(Date.parse(w[key])));
  }
  requireValue(Date.parse(String(w.startsAt)) < Date.parse(String(w.changesAt)));
  const modifiers = record(w.npc);

  for (const [key, value] of Object.entries(modifiers)) {
    requireValue(
      [
        'physicalAttackMultiplier',
        'magicAttackMultiplier',
        'physicalDefenseMultiplier',
        'magicDefenseMultiplier',
        'speedMultiplier',
        'critRatePoints'
      ].includes(key) && numeric(value)
    );
    requireValue(key === 'critRatePoints' ? Number(value) >= -100 && Number(value) <= 100 : Number(value) > 0);
  }
  requireValue(Array.isArray(w.changes));
  for (const value of w.changes as unknown[]) {
    const change = record(value);

    requireValue(
      id(change.layer) &&
        id(change.position) &&
        typeof change.attribute === 'string' &&
        ['physicalAttack', 'magicAttack', 'physicalDefense', 'magicDefense', 'speed', 'critRate'].includes(change.attribute) &&
        numeric(change.before) &&
        numeric(change.after)
    );
  }
}
export function parseTribulationConfirmation(value: unknown): TribulationConfirmation {
  const c = record(value);

  requireValue(
    id(c.eventId) &&
      isTribulationGrade(c.grade) &&
      numeric(c.attackMultiplier) &&
      c.attackMultiplier > 0 &&
      typeof c.conditionVersion === 'string' &&
      /^[a-f0-9]{64}$/.test(c.conditionVersion)
  );
  requireValue(
    typeof c.rewardScope === 'string' &&
      ['current', 'cumulative'].includes(c.rewardScope) &&
      ['experienceBefore', 'successExperienceCost', 'failureExperienceAfter'].every(key => numeric(c[key]))
  );
  progress(c.progress);
  requireValue(Array.isArray(c.materials));
  for (const value of c.materials as unknown[]) {
    const m = record(value);

    requireValue(id(m.itemId) && id(m.quantity));
  }
  if (c.attackLimit !== undefined) {
    parseTribulationAttackLimit(c.attackLimit);
  }
  if (c.heartDemon !== undefined) {
    parseTribulationHeartDemon(c.heartDemon);
  }
  if (c.evasion !== undefined) {
    parseTribulationEvasion(c.evasion);
  }
  if (c.karma !== undefined) {
    parseTribulationKarma(c.karma);
  }
  if (c.weather !== undefined) {
    weather(c.weather);
  }
  const b = record(c.battle);

  requireValue(typeof b.name === 'string' && b.mode === 'continuous_layers_v1' && Array.isArray(b.layers) && b.layers.length > 0);
  unit(b.player);
  for (const value of b.layers as unknown[]) {
    const l = record(value);

    requireValue(id(l.layer) && Array.isArray(l.enemies));
    for (const enemy of l.enemies as unknown[]) {
      unit(enemy);
    }
  }

  return c as TribulationConfirmation;
}
export function parseTribulationReceipt(value: unknown): TribulationReceipt | TribulationCharging {
  const r = record(value);

  if (r.status !== undefined) {
    requireValue(
      id(r.eventId) &&
        typeof r.status === 'string' &&
        ['charging', 'cancelled', 'succeeded', 'failed'].includes(r.status) &&
        isTribulationGrade(r.grade) &&
        numeric(r.attackMultiplier) &&
        r.attackMultiplier > 0 &&
        typeof r.conditionVersion === 'string' &&
        /^[a-f0-9]{64}$/.test(r.conditionVersion) &&
        typeof r.refunded === 'boolean'
    );
    for (const key of ['confirmedAt', 'strikeAt']) {
      requireValue(typeof r[key] === 'string' && Number.isFinite(Date.parse(r[key])));
    }
    if (r.cancelledReason !== undefined) {
      requireValue(typeof r.cancelledReason === 'string');
    }

    return r as TribulationCharging;
  }
  requireValue(
    id(r.eventId) &&
      isTribulationGrade(r.grade) &&
      typeof r.success === 'boolean' &&
      typeof r.promoted === 'boolean' &&
      numeric(r.experienceBefore) &&
      numeric(r.experienceAfter)
  );
  progress(r.progress);
  requireValue(Array.isArray(r.materials));
  for (const value of r.materials as unknown[]) {
    const m = record(value);

    requireValue(id(m.itemId) && typeof m.itemName === 'string' && id(m.requiredQuantity));
  }
  if (r.conditions !== undefined) {
    const conditions = record(r.conditions);

    if (conditions.attackLimit !== undefined) {
      parseTribulationAttackLimit(conditions.attackLimit);
    }
    if (conditions.heartDemon !== undefined) {
      parseTribulationHeartDemon(conditions.heartDemon);
    }
    if (conditions.evasion !== undefined) {
      parseTribulationEvasion(conditions.evasion);
    }
    if (conditions.karma !== undefined) {
      parseTribulationKarma(conditions.karma);
    }
    if (conditions.disruption !== undefined) {
      parseDisruptionSummary(conditions.disruption);
    }
    if (conditions.weather !== undefined) {
      weather(conditions.weather);
    }
  }
  const b = record(r.battle);

  requireValue(typeof b.name === 'string' && typeof b.summary === 'string' && numeric(b.totalLayers) && numeric(b.passedLayers));
  if (r.debuff !== undefined) {
    const d = record(r.debuff);

    requireValue(typeof d.applied === 'boolean' && typeof d.expiresAt === 'string' && Number.isFinite(Date.parse(d.expiresAt)));
  }

  return r as TribulationReceipt;
}
