import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  NotFoundException,
  BadRequestException,
  HttpStatus,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RegisterTokenCommand } from '../application/commands/register-token.command';
import { UpdateTokenCommand } from '../application/commands/update-token.command';
import { DeleteTokenCommand } from '../application/commands/delete-token.command';
import { GetUserTokensQuery } from '../application/queries/get-user-tokens.query';
import { RegisterTokenDto } from './dto/register-token.dto';
import { UpdateTokenDto } from './dto/update-token.dto';
import { DeviceTokenResponseDto } from './dto/device-token-response.dto';
import { DeviceToken } from '../domain/device-token.entity';

@ApiTags('Device Tokens')
@ApiBearerAuth('bearerAuth')
@Controller('device-tokens')
@UseGuards(JwtAuthGuard)
export class DeviceTokenController {
  private readonly logger = new Logger(DeviceTokenController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register a new device token' })
  @ApiResponse({
    status: 201,
    description: 'Device token registered successfully',
    type: DeviceTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 409,
    description: 'Device token already exists',
  })
  async registerToken(
    @Body() registerTokenDto: RegisterTokenDto,
    @CurrentUser('id') userId: string,
  ): Promise<DeviceTokenResponseDto> {
    this.logger.log(`Registering device token for user ${userId}`);

    // Provider-platform compatibility guard (additional API-layer validation)
    const provider = registerTokenDto.provider.toLowerCase();
    const platform = registerTokenDto.platform.toLowerCase();
    if (
      (provider === 'fcm' && !(platform === 'android' || platform === 'web')) ||
      (provider === 'apns' && platform !== 'ios') ||
      (provider === 'expo' && !(platform === 'ios' || platform === 'android'))
    ) {
      throw new BadRequestException(
        `Provider ${provider} không tương thích với platform ${platform}`,
      );
    }

    const command = new RegisterTokenCommand(
      userId,
      registerTokenDto.token,
      registerTokenDto.platform,
      registerTokenDto.provider,
      registerTokenDto.deviceId,
      // pass metadata if command supports it in overloads; if not, repository will enrich later
      registerTokenDto.deviceName,
      registerTokenDto.osVersion,
      registerTokenDto.appVersion,
    );

    const deviceToken = await this.commandBus.execute(command);
    return this.toResponseDto(deviceToken);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing device token' })
  @ApiResponse({
    status: 200,
    description: 'Device token updated successfully',
    type: DeviceTokenResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Device token not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only update own tokens',
  })
  async updateToken(
    @Param('id') id: string,
    @Body() updateTokenDto: UpdateTokenDto,
    @CurrentUser('id') userId: string,
  ): Promise<DeviceTokenResponseDto> {
    this.logger.log(`Updating device token ${id} for user ${userId}`);

    const command = new UpdateTokenCommand(
      id,
      userId,
      updateTokenDto.token,
      updateTokenDto.isActive,
    );

    const deviceToken = await this.commandBus.execute(command);
    return this.toResponseDto(deviceToken);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a device token' })
  @ApiResponse({
    status: 204,
    description: 'Device token deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Device token not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only delete own tokens',
  })
  async deleteToken(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<void> {
    this.logger.log(`Deleting device token ${id} for user ${userId}`);

    const command = new DeleteTokenCommand(id, userId);
    await this.commandBus.execute(command);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get all device tokens for current user' })
  @ApiResponse({
    status: 200,
    description: 'Device tokens retrieved successfully',
    type: [DeviceTokenResponseDto],
  })
  async getUserTokens(@CurrentUser('id') userId: string): Promise<DeviceTokenResponseDto[]> {
    this.logger.log(`Getting device tokens for user ${userId}`);

    const query = new GetUserTokensQuery(userId);
    const deviceTokens = await this.queryBus.execute(query);

    return deviceTokens.map((token: DeviceToken) => this.toResponseDto(token));
  }

  private toResponseDto(deviceToken: DeviceToken): DeviceTokenResponseDto {
    return {
      id: deviceToken.id,
      userId: deviceToken.userId,
      token: deviceToken.token,
      platform: deviceToken.platform.value,
      provider: deviceToken.provider.value,
      deviceId: deviceToken.deviceId,
      isActive: deviceToken.isActive,
      lastUsedAt: deviceToken.lastUsedAt,
      deviceName: (deviceToken as any).deviceName,
      osVersion: (deviceToken as any).osVersion,
      appVersion: (deviceToken as any).appVersion,
      createdAt: deviceToken.createdAt,
      updatedAt: deviceToken.updatedAt,
    };
  }
}
