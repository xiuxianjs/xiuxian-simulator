import { parsePublicPlayerProfileBasic, readPublicPlayerQueryRecord } from './public-player-profile-query';

function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('查看配装文本数据不完整');
  }

  return value;
}

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('查看配装数值数据不完整');
  }

  return value;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error('查看配装列表数据不完整');
  }

  return value;
}

export function parseBackendPublicPlayerLoadout(value: unknown) {
  const { found, profile, hideProfile, loadout } = readPublicPlayerQueryRecord(value);
  const basic = parsePublicPlayerProfileBasic(profile);

  if (typeof found !== 'boolean' || typeof hideProfile !== 'boolean' || found !== (basic !== null) || ((!found || hideProfile) && loadout !== undefined)) {
    throw new Error('查看配装资料数据不完整');
  }
  if (!basic || hideProfile) {
    return { profile: basic, hideProfile };
  }

  const data = readPublicPlayerQueryRecord(loadout);
  const artifact = data.soulArtifact === null ? null : readPublicPlayerQueryRecord(data.soulArtifact);

  return {
    profile: basic,
    hideProfile,
    loadout: {
      equipment: array(data.equipment).map(value => {
        const { slot, name, grade, set, stats } = readPublicPlayerQueryRecord(value);

        return {
          slot: text(slot),
          name: text(name),
          grade: text(grade),
          set: text(set),
          stats: array(stats).map(value => {
            const { label, value: amount, percent } = readPublicPlayerQueryRecord(value);

            if (percent !== undefined && typeof percent !== 'boolean') {
              throw new Error('查看配装属性单位无效');
            }

            return { label: text(label), value: number(amount), percent: percent === true };
          })
        };
      }),
      skillBooks: array(data.skillBooks).map(value => {
        const { slot, name, grade, cost, cooldown } = readPublicPlayerQueryRecord(value);

        return { slot: text(slot), name: text(name), grade: text(grade), cost: number(cost), cooldown: number(cooldown) };
      }),
      soulArtifact: artifact && {
        name: text(artifact.name),
        grade: text(artifact.grade),
        level: number(artifact.level),
        category: text(artifact.category),
        positioning: text(artifact.positioning),
        description: text(artifact.description)
      }
    }
  };
}
