export interface PlayerNoticeItem {
  id: number;
  title: string;
  subtitle: string;
  updatedAt: string;
  isRead: boolean;
}

export interface PlayerNoticePage {
  items: PlayerNoticeItem[];
  total: number;
  page: number;
  pageSize: number;
}
