import { Injectable, CanActivate, ExecutionContext, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if Authorization header exists
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    // Extract token
    const token = authHeader.substring(7);

    try {
      // Decode JWT token (simple decode, no verification for now)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

      // Set user in request for CurrentUser decorator
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        fullName: payload.fullName,
        ...payload,
      };

      return true;
    } catch (error) {
      return false;
    }
  }
}

export const AuthGuard = () => UseGuards(JwtAuthGuard);
