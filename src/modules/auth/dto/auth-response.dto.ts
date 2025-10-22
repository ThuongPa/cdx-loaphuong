import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({
    description: 'User ID',
    example: 'cmfxplnhx0000mthirstsrxze',
  })
  id: string;

  @ApiProperty({
    description: 'User role',
    example: 'ADMIN_XA',
  })
  role: string;

  @ApiProperty({
    description: 'User full name',
    example: 'System Administrator',
  })
  fullName: string;

  @ApiProperty({
    description: 'Is first login',
    example: false,
  })
  isFirstLogin: boolean;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'User information',
    type: UserDto,
  })
  user: UserDto;
}
