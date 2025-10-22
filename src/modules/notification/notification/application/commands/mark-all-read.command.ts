export class MarkAllAsReadCommand {
  userId: string;
}

export interface MarkAllAsReadResult {
  success: boolean;
  updatedCount: number;
  readAt: Date;
}
