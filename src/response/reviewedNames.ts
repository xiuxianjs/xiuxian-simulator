// Receipts saved before server-side name review have no marker.
export function hasReviewedNames(data: unknown): boolean {
  return typeof data === 'object' && data !== null && 'namesReviewed' in data && data.namesReviewed === true;
}
