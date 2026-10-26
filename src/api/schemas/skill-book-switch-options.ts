/**
 * The minimal read model used to render the skill-book switch chooser.
 * It deliberately excludes combat attributes and write-state details.
 */
export interface SkillBookSwitchOption {
  id: number;
  name: string;
  skillType: '战技' | '被动技' | '神通';
  status: 2 | 3;
  isInUse: boolean;
  canSwitch: boolean;
}
