import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AuthLoginDto {
  @ApiProperty({
    description: 'User identifier (username or email)',
    example: 'admin',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    description: 'User password',
    example: 'Admin123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
