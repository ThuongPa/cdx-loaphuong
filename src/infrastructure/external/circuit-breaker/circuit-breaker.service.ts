import { Injectable, Logger } from '@nestjs/common';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  timeout: number;
  resetTimeout: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<
    string,
    {
      state: CircuitBreakerState;
      failureCount: number;
      lastFailureTime: number;
      nextAttempt: number;
    }
  >();

  private readonly defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 5,
    timeout: 30000, // 30 seconds
    resetTimeout: 60000, // 1 minute
  };

  // Novu-specific circuit breaker configuration
  private readonly novuOptions: CircuitBreakerOptions = {
    failureThreshold: 5, // Open after 5 consecutive failures
    timeout: 30000, // 30 seconds timeout
    resetTimeout: 30000, // 30 seconds half-open test
  };

  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    options: Partial<CircuitBreakerOptions> = {},
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    const circuit = this.getOrCreateCircuit(circuitName, opts);

    if (circuit.state === CircuitBreakerState.OPEN) {
      if (Date.now() < circuit.nextAttempt) {
        throw new Error(`Circuit breaker ${circuitName} is OPEN`);
      }
      circuit.state = CircuitBreakerState.HALF_OPEN;
    }

    try {
      const result = await Promise.race([operation(), this.createTimeoutPromise(opts.timeout)]);

      this.onSuccess(circuit);
      return result;
    } catch (error) {
      this.onFailure(circuit, circuitName, opts);

      // Provide more specific error message for auth-service
      if (circuitName === 'auth-service') {
        throw new Error(`Circuit breaker auth-service is OPEN`);
      }

      throw error;
    }
  }

  private getOrCreateCircuit(name: string, options: CircuitBreakerOptions) {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        lastFailureTime: 0,
        nextAttempt: 0,
      });
    }
    return this.circuits.get(name)!;
  }

  private onSuccess(circuit: any) {
    circuit.failureCount = 0;
    circuit.state = CircuitBreakerState.CLOSED;
  }

  private onFailure(circuit: any, name: string, options: CircuitBreakerOptions) {
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();

    if (circuit.state === CircuitBreakerState.HALF_OPEN) {
      // If we're in HALF_OPEN state and get a failure, go back to OPEN
      circuit.state = CircuitBreakerState.OPEN;
      circuit.nextAttempt = Date.now() + options.resetTimeout;
      this.logger.warn(`Circuit breaker ${name} is now OPEN (from HALF_OPEN)`);
    } else if (circuit.failureCount >= options.failureThreshold) {
      circuit.state = CircuitBreakerState.OPEN;
      circuit.nextAttempt = Date.now() + options.resetTimeout;
      this.logger.warn(`Circuit breaker ${name} is now OPEN`);
    }
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Circuit breaker timeout'));
      }, timeout);
    });
  }

  getCircuitState(name: string): CircuitBreakerState {
    const circuit = this.circuits.get(name);
    return circuit?.state || CircuitBreakerState.CLOSED;
  }

  resetCircuit(name: string): void {
    if (this.circuits.has(name)) {
      const circuit = this.circuits.get(name)!;
      circuit.state = CircuitBreakerState.CLOSED;
      circuit.failureCount = 0;
      circuit.lastFailureTime = 0;
      circuit.nextAttempt = 0;
      this.logger.log(`Circuit breaker ${name} has been reset`);
    }
  }

  /**
   * Execute operation with Novu-specific circuit breaker configuration
   */
  async executeWithNovuConfig<T>(operation: () => Promise<T>): Promise<T> {
    return this.execute('novu-api', operation, this.novuOptions);
  }

  /**
   * Check if circuit breaker is open for a specific service
   */
  isCircuitOpen(circuitName: string): boolean {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) return false;

    if (circuit.state === CircuitBreakerState.OPEN) {
      // Check if it's time to try half-open
      if (Date.now() >= circuit.nextAttempt) {
        circuit.state = CircuitBreakerState.HALF_OPEN;
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Get circuit breaker metrics
   */
  getCircuitMetrics(circuitName: string): {
    state: CircuitBreakerState;
    failureCount: number;
    lastFailureTime: number;
    nextAttempt: number;
    isOpen: boolean;
  } | null {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) return null;

    return {
      state: circuit.state,
      failureCount: circuit.failureCount,
      lastFailureTime: circuit.lastFailureTime,
      nextAttempt: circuit.nextAttempt,
      isOpen: this.isCircuitOpen(circuitName),
    };
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllCircuitMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};

    for (const [name, circuit] of this.circuits.entries()) {
      metrics[name] = {
        state: circuit.state,
        failureCount: circuit.failureCount,
        lastFailureTime: circuit.lastFailureTime,
        nextAttempt: circuit.nextAttempt,
        isOpen: this.isCircuitOpen(name),
      };
    }

    return metrics;
  }

  /**
   * Force circuit breaker to half-open state for testing
   */
  forceHalfOpen(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.state = CircuitBreakerState.HALF_OPEN;
      circuit.nextAttempt = 0;
      this.logger.log(`Circuit breaker ${circuitName} forced to HALF_OPEN state`);
    }
  }
}
