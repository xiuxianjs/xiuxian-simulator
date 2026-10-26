export type NewcomerGuideStep = 2 | 3 | 4 | 5;

// This is only the interaction cursor. Guide narration, step choice and every
// reward/promotion remain outside this storage DTO.
export type NewcomerGuideProgress = {
  step: NewcomerGuideStep | null;
  version: number;
  expiresAt: string | null;
};

// The authoritative server action result. The robot selects only the matching
// presentation for action; guide state and game effects have already been
// decided and committed by Go.
export type NewcomerGuideAction = 'step-3' | 'step-4' | 'step-5' | 'promotion-failed' | 'completed' | 'skipped' | 'cleared';

export type NewcomerGuideActionResult = {
  action: NewcomerGuideAction;
  progress: NewcomerGuideProgress;
  presentation: {
    title: string;
    heading: string;
    text: string;
    showActionBar: boolean;
    advice: Array<{ command: string; description: string }>;
  };
  preparation?: {
    alreadyPrepared: boolean;
    experience: number;
    requiredExperience: number;
    materials: Array<{ itemId: number; itemName: string; quantity: number }>;
    cacheInvalidationPending: boolean;
  };
  promotion?: { success: boolean; message: string; newRealm?: { name?: string } };
  completion?: {
    alreadyClaimed: boolean;
    renameCards: number;
    sexChangeCards: number;
    spiritCrystals: number;
    cacheInvalidationPending: boolean;
  };
};
