import { Injectable, CanActivate, ExecutionContext, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // For now, we'll just check if Authorization header exists
    // In a real implementation, you would validate the JWT token
    const authHeader = request.headers.authorization;
    return !!authHeader && authHeader.startsWith('Bearer ');
  }
}

export const AuthGuard = () => UseGuards(JwtAuthGuard);
