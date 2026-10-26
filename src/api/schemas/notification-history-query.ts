export interface NotificationHistoryItem {
  id: string;
  time: string;
  text: string;
  delivery: string;
  flymail?: unknown;
}

/**
 * Archived player notifications. The API is a read-only view and always
 * returns at most five records per page.
 */
export interface NotificationHistoryQueryData {
  page: number;
  hasNext: boolean;
  nextCursor?: string;
  items: NotificationHistoryItem[];
}
