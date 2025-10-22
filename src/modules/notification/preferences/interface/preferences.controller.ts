import { Controller, Get, Put, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PreferencesResponseDto } from './dto/preferences-response.dto';
import { GetPreferencesQuery } from '../application/commands/get-preferences.query';
import { UpdatePreferencesCommand } from '../application/commands/update-preferences.command';
import { ApiResponseDto } from '../../../../common/dto/api-response.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Preferences')
@Controller('preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class PreferencesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User preferences retrieved successfully',
    type: PreferencesResponseDto,
  })
  async getPreferences(
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<PreferencesResponseDto>> {
    try {
      const query = new GetPreferencesQuery(userId);
      const preferences = await this.queryBus.execute(query);

      const response = new PreferencesResponseDto(
        preferences.id,
        preferences.userId,
        preferences.channelPreferences,
        preferences.typePreferences,
        preferences.quietHours,
        preferences.createdAt,
        preferences.updatedAt,
      );

      return {
        success: true,
        message: 'Preferences retrieved successfully',
        data: response,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiBody({
    description: 'User notification preferences update data',
    type: UpdatePreferencesDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User preferences updated successfully',
    type: PreferencesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid preferences data or emergency notifications cannot be disabled',
  })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdatePreferencesDto,
  ): Promise<ApiResponseDto<PreferencesResponseDto>> {
    try {
      const command = new UpdatePreferencesCommand(
        userId,
        updateDto.channels,
        updateDto.types,
        updateDto.quietHours,
      );

      const preferences = await this.commandBus.execute(command);

      const response = new PreferencesResponseDto(
        preferences.id,
        preferences.userId,
        preferences.channelPreferences,
        preferences.typePreferences,
        preferences.quietHours,
        preferences.createdAt,
        preferences.updatedAt,
      );

      return {
        success: true,
        message: 'Preferences updated successfully',
        data: response,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }
}
