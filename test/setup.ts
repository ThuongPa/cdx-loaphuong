// Global test setup for E2E tests
import { Logger } from '@nestjs/common';

// Disable console logs during tests
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore console output
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test timeout
jest.setTimeout(120000);
