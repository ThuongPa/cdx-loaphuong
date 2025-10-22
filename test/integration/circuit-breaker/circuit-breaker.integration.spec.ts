import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  CircuitBreakerService,
  CircuitBreakerState,
} from '../../../src/infrastructure/external/circuit-breaker/circuit-breaker.service';

describe('Circuit Breaker Integration Tests', () => {
  let app: INestApplication;
  let circuitBreakerService: CircuitBreakerService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    circuitBreakerService = moduleFixture.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Reset circuit breaker state before each test
    circuitBreakerService.resetCircuit('test-circuit');
  });

  describe('Circuit Breaker State Transitions', () => {
    it('should start in CLOSED state', () => {
      // Act
      const state = circuitBreakerService.getCircuitState('test-circuit');

      // Assert
      expect(state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should transition to OPEN state after failure threshold', async () => {
      // Arrange
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      // Act - Execute failing operations to reach threshold
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute('test-circuit', failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      // Assert
      const state = circuitBreakerService.getCircuitState('test-circuit');
      expect(state).toBe(CircuitBreakerState.OPEN);
    });

    it('should transition to OPEN state after failed operation in HALF_OPEN', async () => {
      // Arrange
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      const customOptions = {
        failureThreshold: 5,
        timeout: 30000,
        resetTimeout: 100, // Short timeout for testing
      };

      // Act - Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute('test-circuit', failingOperation, customOptions);
        } catch (error) {
          // Expected to fail
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Try to execute again - should transition to HALF_OPEN first
      const failingOperation2 = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      try {
        await circuitBreakerService.execute('test-circuit', failingOperation2, customOptions);
      } catch (error) {
        // Expected to fail
      }

      // Assert - Check state after the operation (should be OPEN because operation failed in HALF_OPEN)
      const state = circuitBreakerService.getCircuitState('test-circuit');
      expect(state).toBe(CircuitBreakerState.OPEN);
    });

    it('should transition to CLOSED state after successful operation in reset timeout', async () => {
      // Arrange
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      const customOptions = {
        failureThreshold: 5,
        timeout: 30000,
        resetTimeout: 100, // Short timeout for testing
      };

      // Act - Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute('test-circuit', failingOperation, customOptions);
        } catch (error) {
          // Expected to fail
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Try to execute again - should transition to HALF_OPEN
      const successfulOperation = jest.fn().mockResolvedValue('Success');
      try {
        await circuitBreakerService.execute('test-circuit', successfulOperation, customOptions);
      } catch (error) {
        // Should not fail
      }

      // Assert - Check state after the operation
      const state = circuitBreakerService.getCircuitState('test-circuit');
      expect(state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should transition back to CLOSED state after successful operation', async () => {
      // Arrange
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      const successfulOperation = jest.fn().mockResolvedValue('Success');
      const customOptions = {
        failureThreshold: 5,
        timeout: 30000,
        resetTimeout: 100, // Short timeout for testing
      };

      // Act - Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute('test-circuit', failingOperation, customOptions);
        } catch (error) {
          // Expected to fail
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Execute successful operation
      const result = await circuitBreakerService.execute(
        'test-circuit',
        successfulOperation,
        customOptions,
      );

      // Assert
      expect(result).toBe('Success');
      const state = circuitBreakerService.getCircuitState('test-circuit');
      expect(state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('Circuit Breaker Execution', () => {
    it('should execute successful operations normally', async () => {
      // Arrange
      const successfulOperation = jest.fn().mockResolvedValue('Success');

      // Act
      const result = await circuitBreakerService.execute('test-circuit', successfulOperation);

      // Assert
      expect(result).toBe('Success');
      expect(successfulOperation).toHaveBeenCalledTimes(1);
    });

    it('should throw error for failed operations', async () => {
      // Arrange
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      // Act & Assert
      await expect(circuitBreakerService.execute('test-circuit', failingOperation)).rejects.toThrow(
        'Service unavailable',
      );
    });

    it('should throw error when circuit is OPEN', async () => {
      // Arrange
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      const anyOperation = jest.fn().mockResolvedValue('Success');

      // Act - Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute('test-circuit', failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      // Try to execute operation when circuit is open
      await expect(circuitBreakerService.execute('test-circuit', anyOperation)).rejects.toThrow(
        'Circuit breaker test-circuit is OPEN',
      );
    });

    it('should handle timeout operations', async () => {
      // Arrange
      const timeoutOperation = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)), // Longer than timeout
      );

      // Act & Assert
      await expect(
        circuitBreakerService.execute('test-circuit', timeoutOperation, { timeout: 100 }),
      ).rejects.toThrow('Operation timeout');
    });
  });

  describe('Novu-Specific Circuit Breaker', () => {
    it('should execute with Novu configuration', async () => {
      // Arrange
      const successfulOperation = jest.fn().mockResolvedValue('Success');

      // Act
      const result = await circuitBreakerService.executeWithNovuConfig(successfulOperation);

      // Assert
      expect(result).toBe('Success');
      expect(successfulOperation).toHaveBeenCalledTimes(1);
    });

    it('should check if Novu circuit is open', () => {
      // Act
      const isOpen = circuitBreakerService.isCircuitOpen('novu-api');

      // Assert
      expect(isOpen).toBe(false); // Should start closed
    });

    it('should open Novu circuit after failures', async () => {
      // Arrange
      const failingOperation = jest.fn().mockRejectedValue(new Error('Novu service unavailable'));

      // Act - Execute failing operations to reach threshold
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.executeWithNovuConfig(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      // Assert
      const isOpen = circuitBreakerService.isCircuitOpen('novu-api');
      expect(isOpen).toBe(true);
    });
  });

  describe('Circuit Breaker Metrics', () => {
    it('should get circuit metrics', async () => {
      // Arrange
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      // Act - Execute some operations
      try {
        await circuitBreakerService.execute('test-circuit', failingOperation);
      } catch (error) {
        // Expected to fail
      }

      const metrics = circuitBreakerService.getCircuitMetrics('test-circuit');

      // Assert
      expect(metrics).toEqual({
        state: CircuitBreakerState.CLOSED,
        failureCount: 1,
        lastFailureTime: expect.any(Number),
        nextAttempt: 0,
        isOpen: false,
      });
    });

    it('should get all circuit metrics', async () => {
      // Arrange
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      // Act - Execute operations on multiple circuits
      try {
        await circuitBreakerService.execute('circuit-1', failingOperation);
        await circuitBreakerService.execute('circuit-2', failingOperation);
      } catch (error) {
        // Expected to fail
      }

      // Ensure circuit-2 is created by executing another operation
      try {
        await circuitBreakerService.execute('circuit-2', failingOperation);
      } catch (error) {
        // Expected to fail
      }

      const allMetrics = circuitBreakerService.getAllCircuitMetrics();

      // Assert
      expect(allMetrics).toHaveProperty('circuit-1');
      expect(allMetrics).toHaveProperty('circuit-2');
      expect(allMetrics['circuit-1']).toEqual({
        state: CircuitBreakerState.CLOSED,
        failureCount: 1,
        lastFailureTime: expect.any(Number),
        nextAttempt: 0,
        isOpen: false,
      });
    });

    it('should return null for non-existent circuit metrics', () => {
      // Act
      const metrics = circuitBreakerService.getCircuitMetrics('non-existent');

      // Assert
      expect(metrics).toBeNull();
    });
  });

  describe('Circuit Breaker Management', () => {
    it('should reset circuit breaker', async () => {
      // Arrange
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      // Act - Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute('test-circuit', failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      // Reset the circuit
      circuitBreakerService.resetCircuit('test-circuit');

      // Assert
      const state = circuitBreakerService.getCircuitState('test-circuit');
      expect(state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should force circuit to half-open state', () => {
      // Act
      circuitBreakerService.forceHalfOpen('test-circuit');

      // Assert
      const state = circuitBreakerService.getCircuitState('test-circuit');
      expect(state).toBe(CircuitBreakerState.HALF_OPEN);
    });
  });

  describe('Circuit Breaker Configuration', () => {
    it('should use custom configuration', async () => {
      // Arrange
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      const customOptions = {
        failureThreshold: 2,
        timeout: 1000,
        resetTimeout: 100,
      };

      // Act - Execute failing operations to reach custom threshold
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreakerService.execute('custom-circuit', failingOperation, customOptions);
        } catch (error) {
          // Expected to fail
        }
      }

      // Assert
      const state = circuitBreakerService.getCircuitState('custom-circuit');
      expect(state).toBe(CircuitBreakerState.OPEN);
    });

    it('should handle concurrent operations', async () => {
      // Arrange
      const successfulOperation = jest.fn().mockResolvedValue('Success');
      const operations = Array(10)
        .fill(null)
        .map(() => circuitBreakerService.execute('concurrent-circuit', successfulOperation));

      // Act
      const results = await Promise.all(operations);

      // Assert
      expect(results).toHaveLength(10);
      expect(results.every((result) => result === 'Success')).toBe(true);
      expect(successfulOperation).toHaveBeenCalledTimes(10);
    });
  });
});
