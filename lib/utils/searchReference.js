//#region src/utils/searchReference.ts
const isSearchReference = (value) => typeof value === "string" && /^[a-f0-9]{24}$/.test(value);
const isMarketSearchReference = (value) => typeof value === "string" && /^r1_[0-9a-z]{1,13}_ms_[0-9a-z]{1,9}_[a-f0-9]{24}$/.test(value);

//#endregion
export { isMarketSearchReference, isSearchReference };