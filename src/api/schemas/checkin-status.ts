export type CheckInStatusData = {
  asOf: string;
  daily: {
    available: boolean;
    signed: boolean;
    accumulatedDays: number;
  };
  newcomer: {
    eligible: boolean;
    available: boolean;
    signed: boolean;
    accumulatedDays: number;
    expiresOn: string;
    expiresAt: string;
  };
  guild: {
    joined: boolean;
    available: boolean;
    signed: boolean;
  };
  newcomerCarnival: {
    visible: boolean;
    currentDayIndex: number;
    daysSinceRegistration: number;
  };
  celestial: {
    available: boolean;
    signedSlotIds: number[];
    availableSlotIds: number[];
    enabledSlots: {
      id: number;
      name: string;
      startHour: number;
      startMinute: number;
      endHour: number;
      endMinute: number;
      weight: number;
      active: boolean;
      signed: boolean;
      available: boolean;
    }[];
    nextAvailableAt: string | null;
  };
};
