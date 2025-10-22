import { applyDecorators, Res } from '@nestjs/common';
import { ApiResponse, ApiResponseOptions } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { Type } from 'class-transformer';

export const ApiResponseWrapper = <TModel extends typeof Type>(
  model: TModel,
  options?: ApiResponseOptions,
) => {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: 'Success',
      type: model,
      ...options,
    }),
  );
};
