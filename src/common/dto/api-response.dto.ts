export class ApiResponseDto<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}
