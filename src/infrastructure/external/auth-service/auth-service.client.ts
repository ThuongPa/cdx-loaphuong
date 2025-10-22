import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { UserRole } from '../../../common/enums/user-role.enum';

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  isActive: boolean;
  lastSyncedAt: Date;
}

@Injectable()
export class AuthServiceClient {
  private readonly logger = new Logger(AuthServiceClient.name);
  private readonly authServiceUrl: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly httpService: HttpService,
  ) {
    this.authServiceUrl =
      this.configService.get<string>('AUTH_BASE_URL') || 'https://auth.cudanso.net';
    this.timeout = this.configService.get<number>('AUTH_SERVICE_TIMEOUT') || 10000;
    this.retries = this.configService.get<number>('AUTH_SERVICE_RETRIES') || 3;
  }

  async validateToken(token: string): Promise<User> {
    return this.circuitBreaker.execute(
      'auth-service',
      async () => {
        this.logger.log('Validating token with auth service');

        try {
          const response = await firstValueFrom(
            this.httpService.get(`${this.authServiceUrl}/auth/validate`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              timeout: this.timeout,
            }),
          );

          // Transform response to User interface
          const userData = response.data;
          const user: User = {
            id: userData.id || userData.sub,
            email: userData.email,
            phone: userData.phoneNumber,
            firstName: userData.firstName || userData.fullName?.split(' ')[0],
            lastName: userData.lastName || userData.fullName?.split(' ').slice(1).join(' '),
            roles: userData.role ? [this.mapRoleToEnum(userData.role)] : [],
            isActive: true,
            lastSyncedAt: new Date(),
          };

          this.logger.log('Token validated successfully', {
            userId: user.id,
            roles: user.roles,
            mappedRole: this.mapRoleToEnum(userData.role),
          });
          return user;
        } catch (error) {
          this.logger.error('Token validation failed', error);
          throw error;
        }
      },
      {
        failureThreshold: 3,
        timeout: this.timeout,
        resetTimeout: 60000,
      },
    );
  }

  async getUserById(userId: string): Promise<User> {
    return this.circuitBreaker.execute(
      'auth-service',
      async () => {
        this.logger.log('Getting user by ID:', userId);

        try {
          const response = await firstValueFrom(
            this.httpService.get(`${this.authServiceUrl}/users/${userId}`, {
              timeout: this.timeout,
            }),
          );

          // Transform response to User interface
          const userData = response.data;
          const user: User = {
            id: userData.id,
            email: userData.email,
            phone: userData.phoneNumber,
            firstName: userData.firstName || userData.fullName?.split(' ')[0],
            lastName: userData.lastName || userData.fullName?.split(' ').slice(1).join(' '),
            roles: userData.role ? [userData.role] : [],
            isActive: userData.isActive !== false,
            lastSyncedAt: new Date(),
          };

          this.logger.log('User retrieved successfully');
          return user;
        } catch (error) {
          // Handle 404 errors gracefully
          if (error.response?.status === 404) {
            this.logger.warn(`User not found in auth-service: ${userId}`);
            return null as any; // Return null to indicate user not found
          }

          this.logger.error('Failed to get user by ID', error);
          throw error;
        }
      },
      {
        failureThreshold: 3,
        timeout: this.timeout,
        resetTimeout: 60000,
      },
    );
  }

  async syncUser(userId: string): Promise<User> {
    return this.circuitBreaker.execute(
      'auth-service',
      async () => {
        // TODO: Implement actual Auth Service sync API call
        this.logger.log('Syncing user with auth service:', userId);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Mock user data
        const user: User = {
          id: userId,
          email: 'test@example.com',
          phone: '+84901234567',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['resident'],
          isActive: true,
          lastSyncedAt: new Date(),
        };

        this.logger.log('User synced successfully');
        return user;
      },
      {
        failureThreshold: 3,
        timeout: this.timeout,
        resetTimeout: 60000,
      },
    );
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return this.circuitBreaker.execute(
      'auth-service',
      async () => {
        this.logger.log('Getting users by role:', role);

        try {
          const response = await firstValueFrom(
            this.httpService.get(`${this.authServiceUrl}/users/by-role`, {
              params: { role },
              timeout: this.timeout,
            }),
          );

          // Transform response to User interface
          const usersData = response.data;
          const users: User[] = Array.isArray(usersData)
            ? usersData.map((userData: any) => ({
                id: userData.id,
                email: userData.email,
                phone: userData.phoneNumber,
                firstName: userData.firstName || userData.fullName?.split(' ')[0],
                lastName: userData.lastName || userData.fullName?.split(' ').slice(1).join(' '),
                roles: userData.role ? [userData.role] : [],
                isActive: userData.isActive !== false,
                lastSyncedAt: new Date(),
              }))
            : [];

          this.logger.log(`Retrieved ${users.length} users for role: ${role}`);
          return users;
        } catch (error) {
          this.logger.error(`Failed to get users for role ${role}`, error);
          // Return empty array instead of throwing to prevent notification failures
          return [];
        }
      },
      {
        failureThreshold: 3,
        timeout: this.timeout,
        resetTimeout: 60000,
      },
    );
  }

  async getUsersByRoles(roles: string[]): Promise<User[]> {
    return this.circuitBreaker.execute(
      'auth-service',
      async () => {
        this.logger.log('Getting users by roles:', roles);

        try {
          const response = await firstValueFrom(
            this.httpService.get(`${this.authServiceUrl}/users/by-roles`, {
              params: { roles: roles.join(',') },
              timeout: this.timeout,
            }),
          );

          // Transform response to User interface
          const usersData = response.data;
          const users: User[] = Array.isArray(usersData)
            ? usersData.map((userData: any) => ({
                id: userData.id,
                email: userData.email,
                phone: userData.phoneNumber,
                firstName: userData.firstName || userData.fullName?.split(' ')[0],
                lastName: userData.lastName || userData.fullName?.split(' ').slice(1).join(' '),
                roles: userData.role ? [userData.role] : [],
                isActive: userData.isActive !== false,
                lastSyncedAt: new Date(),
              }))
            : [];

          this.logger.log(`Retrieved ${users.length} users for roles: ${roles.join(', ')}`);
          return users;
        } catch (error) {
          this.logger.error(`Failed to get users for roles ${roles.join(', ')}`, error);
          // Return empty array instead of throwing to prevent notification failures
          return [];
        }
      },
      {
        failureThreshold: 3,
        timeout: this.timeout,
        resetTimeout: 60000,
      },
    );
  }

  /**
   * Map role string to UserRole enum
   */
  private mapRoleToEnum(role: string): UserRole {
    const roleMap: Record<string, UserRole> = {
      ROLE_RESIDENT: UserRole.RESIDENT,
      ROLE_ADMIN: UserRole.ADMIN,
      ROLE_MANAGER: UserRole.MANAGER,
      ROLE_STAFF: UserRole.MANAGER, // Map STAFF to MANAGER
      ADMIN_XA: UserRole.ADMIN, // Map ADMIN_XA to ADMIN
      resident: UserRole.RESIDENT,
      admin: UserRole.ADMIN,
      manager: UserRole.MANAGER,
      staff: UserRole.MANAGER, // Map staff to MANAGER
    };

    return roleMap[role] || UserRole.RESIDENT;
  }
}
