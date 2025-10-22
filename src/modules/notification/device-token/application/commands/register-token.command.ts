export class RegisterTokenCommand {
  constructor(
    public readonly userId: string,
    public readonly token: string,
    public readonly platform: string,
    public readonly provider: string,
    public readonly deviceId: string,
    public readonly deviceName?: string,
    public readonly osVersion?: string,
    public readonly appVersion?: string,
  ) {}
}
