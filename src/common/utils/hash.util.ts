import * as bcrypt from 'bcrypt';

export class HashUtil {
  private static readonly SALT_ROUNDS = 12;

  static async hash(data: string): Promise<string> {
    return bcrypt.hash(data, this.SALT_ROUNDS);
  }

  static async compare(data: string, hashedData: string): Promise<boolean> {
    return bcrypt.compare(data, hashedData);
  }

  static hashSync(data: string): string {
    return bcrypt.hashSync(data, this.SALT_ROUNDS);
  }

  static compareSync(data: string, hashedData: string): boolean {
    return bcrypt.compareSync(data, hashedData);
  }
}
