export class UpdateTokenCommand {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly token?: string,
    public readonly isActive?: boolean,
  ) {}
}
