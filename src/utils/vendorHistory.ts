/**
 * Vendor History Manager for localStorage
 * Tracks vendor usage patterns for smart suggestions
 */

export interface VendorHistoryEntry {
  vendorId: string;
  count: number;
  lastUsed?: Date;
}

export const VendorHistoryManager = {
  /**
   * Get vendor history from localStorage
   */
  getHistory: (): Map<string, VendorHistoryEntry[]> => {
    try {
      const history = localStorage.getItem('vendor_history');
      if (history) {
        const parsed = JSON.parse(history);
        const map = new Map<string, VendorHistoryEntry[]>();
        
        // Convert back to Map and parse dates
        Object.entries(parsed).forEach(([taskId, entries]: [string, any]) => {
          const vendorEntries = entries.map((entry: any) => ({
            ...entry,
            lastUsed: entry.lastUsed ? new Date(entry.lastUsed) : undefined
          }));
          map.set(taskId, vendorEntries);
        });
        
        return map;
      }
    } catch (error) {
      console.error('Error loading vendor history:', error);
    }
    return new Map();
  },

  /**
   * Save vendor history to localStorage
   */
  saveHistory: (history: Map<string, VendorHistoryEntry[]>): void => {
    try {
      // Convert Map to plain object for JSON serialization
      const plainObject: Record<string, VendorHistoryEntry[]> = {};
      history.forEach((entries, taskId) => {
        plainObject[taskId] = entries;
      });
      
      localStorage.setItem('vendor_history', JSON.stringify(plainObject));
    } catch (error) {
      console.error('Error saving vendor history:', error);
    }
  },

  /**
   * Record vendor usage for a specific task
   */
  recordUsage: (taskId: string, vendorId: string): void => {
    const history = VendorHistoryManager.getHistory();
    const taskHistory = history.get(taskId) || [];
    
    // Find existing entry or create new one
    const existingEntry = taskHistory.find(entry => entry.vendorId === vendorId);
    
    if (existingEntry) {
      existingEntry.count++;
      existingEntry.lastUsed = new Date();
    } else {
      taskHistory.push({
        vendorId,
        count: 1,
        lastUsed: new Date()
      });
    }
    
    // Sort by count (most used first)
    taskHistory.sort((a, b) => b.count - a.count);
    
    history.set(taskId, taskHistory);
    VendorHistoryManager.saveHistory(history);
  },

  /**
   * Get vendor usage count for a specific task
   */
  getUsageCount: (taskId: string, vendorId: string): number => {
    const history = VendorHistoryManager.getHistory();
    const taskHistory = history.get(taskId) || [];
    const entry = taskHistory.find(entry => entry.vendorId === vendorId);
    return entry ? entry.count : 0;
  },

  /**
   * Get most used vendors for a task
   */
  getMostUsedVendors: (taskId: string, limit: number = 3): VendorHistoryEntry[] => {
    const history = VendorHistoryManager.getHistory();
    const taskHistory = history.get(taskId) || [];
    return taskHistory.slice(0, limit);
  },

  /**
   * Clear all vendor history
   */
  clearHistory: (): void => {
    try {
      localStorage.removeItem('vendor_history');
    } catch (error) {
      console.error('Error clearing vendor history:', error);
    }
  },

  /**
   * Clear history for a specific task
   */
  clearTaskHistory: (taskId: string): void => {
    const history = VendorHistoryManager.getHistory();
    history.delete(taskId);
    VendorHistoryManager.saveHistory(history);
  },

  /**
   * Get statistics about vendor usage
   */
  getStats: () => {
    const history = VendorHistoryManager.getHistory();
    const stats = {
      totalTasks: history.size,
      totalVendorUsages: 0,
      mostUsedVendor: null as string | null,
      mostUsedTask: null as string | null,
      maxUsageCount: 0
    };

    let maxVendorUsage = 0;
    let maxTaskUsage = 0;

    history.forEach((entries, taskId) => {
      const taskUsageCount = entries.reduce((sum, entry) => sum + entry.count, 0);
      stats.totalVendorUsages += taskUsageCount;

      if (taskUsageCount > maxTaskUsage) {
        maxTaskUsage = taskUsageCount;
        stats.mostUsedTask = taskId;
      }

      entries.forEach(entry => {
        if (entry.count > maxVendorUsage) {
          maxVendorUsage = entry.count;
          stats.mostUsedVendor = entry.vendorId;
        }
      });
    });

    stats.maxUsageCount = maxVendorUsage;
    return stats;
  }
};
