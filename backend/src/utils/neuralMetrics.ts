export interface NeuralMetrics {
  totalQueries: number;
  neuralMatches: number;
  cacheMatches: number;
  geminiMatches: number;
  averageScore: number;
  averageLatency: number;
  accuracyRate: number;
}

export class MetricsCollector {
  private metrics: NeuralMetrics = {
    totalQueries: 0,
    neuralMatches: 0,
    cacheMatches: 0,
    geminiMatches: 0,
    averageScore: 0,
    averageLatency: 0,
    accuracyRate: 0
  };

  recordNeuralMatch(score: number, latencyMs: number) {
    this.metrics.neuralMatches++;
    this.metrics.totalQueries++;
    this.metrics.averageScore = 
      (this.metrics.averageScore * (this.metrics.totalQueries - 1) + score) / 
      this.metrics.totalQueries;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.totalQueries - 1) + latencyMs) /
      this.metrics.totalQueries;
  }

  recordCacheMatch() {
    this.metrics.cacheMatches++;
    this.metrics.totalQueries++;
  }

  recordGeminiMatch() {
    this.metrics.geminiMatches++;
    this.metrics.totalQueries++;
  }

  getMetrics(): NeuralMetrics {
    if (this.metrics.totalQueries > 0) {
      this.metrics.accuracyRate = 
        (this.metrics.neuralMatches / this.metrics.totalQueries) * 100;
    }
    return this.metrics;
  }

  reset() {
    this.metrics = {
      totalQueries: 0,
      neuralMatches: 0,
      cacheMatches: 0,
      geminiMatches: 0,
      averageScore: 0,
      averageLatency: 0,
      accuracyRate: 0
    };
  }
}

export const neuralMetrics = new MetricsCollector();
