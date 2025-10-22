export class DeleteTokenCommand {
  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {}
}
