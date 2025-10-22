export class BulkMarkReadCommand {
  constructor(
    public readonly userId: string,
    public readonly ids: string[],
  ) {}
}
