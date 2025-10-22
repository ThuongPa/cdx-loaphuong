import { ApiProperty } from '@nestjs/swagger';

export class AuthErrorDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Invalid credentials',
  })
  message: string;

  @ApiProperty({
    description: 'Error code',
    example: 'INVALID_CREDENTIALS',
  })
  code: string;

  @ApiProperty({
    description: 'HTTP status code',
    example: 401,
  })
  statusCode: number;
}
