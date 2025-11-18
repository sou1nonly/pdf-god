const ENABLE_LOGGING = process.env.NODE_ENV === 'development';

export const logger = {
  info: (module: string, message: string, data?: any) => {
    if (ENABLE_LOGGING) {
      console.log(`ℹ️ [${module}] ${message}`, data || '');
    }
  },
  
  warn: (module: string, message: string, data?: any) => {
    if (ENABLE_LOGGING) {
      console.warn(`⚠️ [${module}] ${message}`, data || '');
    }
  },
  
  error: (module: string, message: string, error?: any) => {
    console.error(`❌ [${module}] ${message}`, error || '');
  },
  
  perf: (module: string, operation: string, time: number) => {
    if (ENABLE_LOGGING) {
      console.log(`⚡ [${module}] ${operation} took ${time.toFixed(2)}ms`);
    }
  },
  
  metrics: (module: string, metrics: Record<string, any>) => {
    if (ENABLE_LOGGING) {
      console.log(`📊 [${module}] Metrics:`, metrics);
    }
  },
  
  memory: (module: string, usedMB: number, totalMB?: number) => {
    if (ENABLE_LOGGING && (performance as any).memory) {
      const memoryInfo = totalMB 
        ? `${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB`
        : `${usedMB.toFixed(2)}MB`;
      console.log(`💾 [${module}] Memory: ${memoryInfo}`);
    }
  },
};
