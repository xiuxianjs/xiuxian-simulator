export interface LimitedEventOverviewQueryItem {
  eventId: number;
  eventTitle: string;
  description: string | null;
  startTime: string;
  endTime: string;
  paidTokenName: string;
  freeTokenName: string;
  paidToken: number;
  freeToken: number;
  subActivities: {
    id: number;
    title: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }[];
}
