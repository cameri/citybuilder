// Seeded RNG implementation for deterministic gameplay
// Using a simple Linear Congruential Generator (LCG)

export class SeededRNG {
  private seed: number;
  private current: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
    this.current = seed;
  }

  // Generate next pseudo-random number (0 to 1)
  next(): number {
    // LCG formula: (a * x + c) % m
    // Using constants from Numerical Recipes
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;

    this.current = (a * this.current + c) % m;
    return this.current / m;
  }

  // Generate random integer between min and max (inclusive)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Generate random float between min and max
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  // Generate random boolean with given probability (0-1)
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  // Reset to initial seed
  reset(): void {
    this.current = this.seed;
  }

  // Get current seed for serialization
  getSeed(): number {
    return this.seed;
  }

  // Get current state for serialization
  getState(): number {
    return this.current;
  }

  // Restore state from serialization
  setState(state: number): void {
    this.current = state;
  }
}

// Global RNG instance
let globalRNG: SeededRNG;

export function initializeRNG(seed?: number): void {
  globalRNG = new SeededRNG(seed);
}

export function getRNG(): SeededRNG {
  if (!globalRNG) {
    initializeRNG();
  }
  return globalRNG;
}

// Convenience functions using global RNG
export function random(): number {
  return getRNG().next();
}

export function randomInt(min: number, max: number): number {
  return getRNG().nextInt(min, max);
}

export function randomFloat(min: number, max: number): number {
  return getRNG().nextFloat(min, max);
}

export function randomBool(probability: number = 0.5): boolean {
  return getRNG().nextBool(probability);
}
