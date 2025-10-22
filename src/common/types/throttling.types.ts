export enum ThrottlingRuleType {
  RATE_LIMIT = 'rate_limit',
  BURST_LIMIT = 'burst_limit',
  DAILY_LIMIT = 'daily_limit',
  WEEKLY_LIMIT = 'weekly_limit',
}

export enum ThrottlingRuleScope {
  GLOBAL = 'global',
  USER = 'user',
  ROLE = 'role',
  CATEGORY = 'category',
}

export interface ThrottlingRule {
  id: string;
  name: string;
  type: ThrottlingRuleType;
  scope: ThrottlingRuleScope;
  limit: number;
  window: number; // in seconds
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThrottlingRecord {
  id: string;
  userId: string;
  ruleId: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
  createdAt: Date;
}

export interface ThrottlingViolation {
  id: string;
  userId: string;
  ruleId: string;
  ruleName: string;
  violationCount: number;
  limit: number;
  windowStart: Date;
  createdAt: Date;
}

export interface UserThrottlingProfile {
  id: string;
  userId: string;
  rules: string[];
  isThrottled: boolean;
  throttledUntil?: Date;
  violationCount: number;
  lastViolationAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThrottlingStatistics {
  totalViolations: number;
  activeThrottledUsers: number;
  topViolatingRules: Array<{
    ruleId: string;
    ruleName: string;
    violationCount: number;
  }>;
  averageViolationsPerUser: number;
  lastUpdated: Date;
}

export interface ThrottlingFilters {
  userId?: string;
  ruleId?: string;
  ruleType?: ThrottlingRuleType;
  ruleScope?: ThrottlingRuleScope;
  isActive?: boolean;
  isThrottled?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface ThrottlingSortOptions {
  field: 'createdAt' | 'updatedAt' | 'violationCount';
  order: 'asc' | 'desc';
}

export interface ThrottlingPaginationOptions {
  page: number;
  limit: number;
}

export interface ThrottlingQueryResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}