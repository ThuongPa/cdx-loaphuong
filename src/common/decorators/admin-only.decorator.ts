import { SetMetadata } from '@nestjs/common';

export const AdminOnly = () => SetMetadata('adminOnly', true);
export const ADMIN_ONLY_KEY = 'adminOnly';
