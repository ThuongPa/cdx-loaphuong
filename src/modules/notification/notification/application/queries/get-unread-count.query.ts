export class GetUnreadCountQuery {
  userId: string;
}

export interface UnreadCountResult {
  count: number;
  lastUpdated: Date;
}
