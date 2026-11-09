export const isSearchReference = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);

export const isMarketSearchReference = (value: unknown): value is string => typeof value === 'string' && /^r1_[0-9a-z]{1,13}_ms_[0-9a-z]{1,9}_[a-f0-9]{24}$/.test(value);
