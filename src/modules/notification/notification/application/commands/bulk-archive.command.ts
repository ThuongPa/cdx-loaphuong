export class BulkArchiveCommand {
  constructor(
    public readonly userId: string,
    public readonly ids: string[],
  ) {}
}
