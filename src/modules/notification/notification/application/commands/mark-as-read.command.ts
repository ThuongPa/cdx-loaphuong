export class MarkAsReadCommand {
  notificationId: string;
  userId: string;
}

export interface MarkAsReadResult {
  success: boolean;
  notificationId: string;
  readAt: Date;
}
