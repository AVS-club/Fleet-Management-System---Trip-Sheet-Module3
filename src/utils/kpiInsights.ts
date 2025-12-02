/**
 * KPI Insights Generator
 * Generates contextual AI-like remarks for KPI cards
 */

interface KPIData {
  kpi_key: string;
  kpi_title: string;
  kpi_value_human: string;
  kpi_payload: {
    current_value?: number;
    previous_value?: number;
    change_percent?: number;
    trend?: 'up' | 'down' | 'neutral';
    [key: string]: any;
  };
  theme: string;
}

interface KPICategoryInfo {
  icon: string;
  badge: string;
  badgeColor: string;
  priority: number; // 1 = highest priority
  group: 'financial' | 'activity' | 'performance' | 'efficiency' | 'status';
}

/**
 * Get category information for a KPI
 */
export function getKPICategoryInfo(kpiKey: string): KPICategoryInfo {
  // Comparison KPIs (Month-to-Date, Week-over-Week)
  if (kpiKey.startsWith('comparison.')) {
    if (kpiKey.includes('revenue') || kpiKey.includes('profit')) {
      return {
        icon: '📊',
        badge: kpiKey.includes('mtd') ? 'MTD Comparison' : 'WoW Comparison',
        badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
        priority: 2,
        group: 'financial'
      };
    }
    return {
      icon: '📊',
      badge: kpiKey.includes('mtd') ? 'MTD Comparison' : 'WoW Comparison',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
      priority: 3,
      group: 'activity'
    };
  }
  
  // Performance Rankings
  if (kpiKey.startsWith('performance.')) {
    return {
      icon: '🏆',
      badge: 'Ranking',
      badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
      priority: 4,
      group: 'performance'
    };
  }
  
  // Efficiency Metrics
  if (kpiKey.startsWith('efficiency.')) {
    return {
      icon: '⚡',
      badge: 'Efficiency',
      badgeColor: 'bg-green-100 text-green-700 border-green-200',
      priority: 5,
      group: 'efficiency'
    };
  }
  
  // Monthly Metrics
  if (kpiKey.startsWith('month.')) {
    return {
      icon: '📅',
      badge: 'Monthly',
      badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
      priority: 6,
      group: kpiKey.includes('revenue') || kpiKey.includes('pnl') ? 'financial' : 'activity'
    };
  }
  
  // Today's Metrics
  if (kpiKey.startsWith('today.')) {
    return {
      icon: '📋',
      badge: 'Today',
      badgeColor: 'bg-orange-100 text-orange-700 border-orange-200',
      priority: 7,
      group: 'status'
    };
  }
  
  // Weekly Metrics
  if (kpiKey.startsWith('week.')) {
    return {
      icon: '📆',
      badge: 'This Week',
      badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      priority: 8,
      group: 'activity'
    };
  }
  
  // Current Status
  if (kpiKey.startsWith('current.')) {
    return {
      icon: '🎯',
      badge: 'Status',
      badgeColor: 'bg-teal-100 text-teal-700 border-teal-200',
      priority: 9,
      group: 'status'
    };
  }
  
  // Default
  return {
    icon: '📈',
    badge: 'Metric',
    badgeColor: 'bg-gray-100 text-gray-700 border-gray-200',
    priority: 10,
    group: 'status'
  };
}

/**
 * Generate AI-like insight remark for a KPI
 */
export function generateKPIInsight(kpi: KPIData): string {
  const { kpi_key, kpi_payload, kpi_value_human } = kpi;
  const changePercent = kpi_payload.change_percent || 0;
  const currentValue = kpi_payload.current_value || 0;
  const previousValue = kpi_payload.previous_value || 0;
  
  // Revenue comparisons
  if (kpi_key === 'comparison.mtd_revenue') {
    if (currentValue === 0 && previousValue > 0) {
      return "💡 No income recorded for this month's trips yet. Add income amounts to see accurate revenue comparison.";
    }
    if (changePercent < -50) {
      return `🚨 Revenue down significantly (${Math.abs(changePercent).toFixed(1)}%). Consider reviewing pricing or increasing trip volume.`;
    }
    if (changePercent < -20) {
      return `⚠️ Revenue declining this month. Early month slowdown is normal, but monitor closely.`;
    }
    if (changePercent > 20) {
      return `🎉 Strong revenue growth! ${changePercent.toFixed(1)}% increase over last month's same period.`;
    }
    return `📊 Revenue ${changePercent >= 0 ? 'up' : 'down'} ${Math.abs(changePercent).toFixed(1)}% compared to last month.`;
  }
  
  // Profit comparisons
  if (kpi_key === 'comparison.mtd_profit') {
    if (currentValue === 0 && previousValue > 0) {
      return "💰 Profit tracking requires income data. Add trip income to calculate accurate profit margins.";
    }
    if (changePercent < -30) {
      return `⚠️ Profitability declining. Review expenses and ensure proper pricing for all trips.`;
    }
    if (changePercent > 20) {
      return `💚 Excellent profit growth! Your operational efficiency is improving.`;
    }
    return `💵 Profit margin ${changePercent >= 0 ? 'improving' : 'declining'} by ${Math.abs(changePercent).toFixed(1)}% this month.`;
  }
  
  // Distance comparisons
  if (kpi_key === 'comparison.mtd_distance') {
    if (changePercent < -70) {
      return `🚛 Fleet activity significantly down. Early December is typically slower, but watch for patterns.`;
    }
    if (changePercent < -30) {
      return `📉 Distance down ${Math.abs(changePercent).toFixed(1)}%. Consider if seasonal patterns or capacity issues.`;
    }
    if (changePercent > 20) {
      return `✅ Fleet utilization up ${changePercent.toFixed(1)}%! Higher activity means better asset utilization.`;
    }
    return `🚗 Fleet traveled ${currentValue.toLocaleString()} km so far this month.`;
  }
  
  // Trips comparisons
  if (kpi_key === 'comparison.mtd_trips') {
    if (changePercent < -60) {
      return `📦 Significantly fewer trips than usual. Seasonal slowdown or capacity constraints?`;
    }
    if (changePercent < -20) {
      return `📊 Trip volume down ${Math.abs(changePercent).toFixed(1)}%. Monitor demand patterns.`;
    }
    if (changePercent > 20) {
      return `📈 Trip volume surging! ${changePercent.toFixed(1)}% increase shows strong demand.`;
    }
    return `🚚 Completed ${currentValue} trips so far this month.`;
  }
  
  // Week-over-Week comparisons
  if (kpi_key.includes('wow_')) {
    if (changePercent < -80) {
      return `📅 This week much quieter than last week. Plan ahead for resource allocation.`;
    }
    if (changePercent > 50) {
      return `⚡ Week-over-week activity spike! Ensure adequate staffing and vehicle availability.`;
    }
    return `📆 Weekly ${kpi_key.includes('distance') ? 'distance' : 'trips'} ${changePercent >= 0 ? 'up' : 'down'} ${Math.abs(changePercent).toFixed(1)}% from last week.`;
  }
  
  // Top performers
  if (kpi_key === 'performance.top_vehicle') {
    const vehicleName = kpi_payload.vehicle || kpi_value_human.split(' ')[0];
    const tripCount = kpi_payload.trip_count || 0;
    if (tripCount === 1) {
      return `🚛 ${vehicleName} leads this month with early performance. Monitor throughout the month.`;
    }
    return `🏆 ${vehicleName} is your top-performing vehicle! Consistent utilization and profitability.`;
  }
  
  if (kpi_key === 'performance.top_driver') {
    const driverName = kpi_payload.driver || kpi_value_human.split(' ')[0];
    const tripCount = kpi_payload.trip_count || 0;
    if (tripCount === 1) {
      return `⭐ ${driverName} leads early this month. Great start!`;
    }
    return `🌟 ${driverName} consistently delivers! Top performer this month.`;
  }
  
  // Fuel efficiency
  if (kpi_key === 'efficiency.fuel_trend') {
    const fuelValue = currentValue;
    if (fuelValue > 15) {
      return `⛽ Excellent fuel efficiency at ${fuelValue.toFixed(1)} km/L! Well-maintained fleet.`;
    }
    if (fuelValue > 10) {
      return `✅ Good fuel efficiency. Keep up regular maintenance for optimal performance.`;
    }
    if (fuelValue > 7) {
      return `⚠️ Fuel efficiency could improve. Consider vehicle servicing and driver training.`;
    }
    return `🔧 Low fuel efficiency detected. Schedule maintenance checks soon.`;
  }
  
  // Cost per KM
  if (kpi_key === 'efficiency.cost_per_km') {
    return `💵 Operating at ₹${currentValue.toFixed(2)} per kilometer. Use this for accurate trip pricing.`;
  }
  
  // Monthly aggregates
  if (kpi_key === 'month.revenue') {
    if (currentValue === 0) {
      return "💡 Add income data to your trips to track monthly revenue.";
    }
    return `💰 Total revenue: ${kpi_value_human}. Track weekly to spot trends early.`;
  }
  
  if (kpi_key === 'month.trips') {
    return `🚚 ${currentValue} trips completed this month. ${currentValue > 50 ? 'Strong volume!' : 'Early in the month - expect more activity.'}`;
  }
  
  if (kpi_key === 'month.pnl') {
    if (currentValue === 0) {
      return "📊 P&L requires complete income and expense data for accuracy.";
    }
    return `📈 Monthly P&L: ${kpi_value_human}. ${currentValue > 0 ? 'Profitable operations!' : 'Review expenses to improve margins.'}`;
  }
  
  // Today's metrics
  if (kpi_key === 'today.trips' && currentValue === 0) {
    return "📋 No trips recorded today yet. Quiet day or data pending?";
  }
  
  if (kpi_key === 'today.distance' && currentValue === 0) {
    return "🚗 No distance logged today. Day just starting or downtime?";
  }
  
  // Fleet utilization
  if (kpi_key === 'current.fleet_utilization') {
    const utilizationMatch = kpi_value_human.match(/(\d+)%/);
    if (utilizationMatch) {
      const util = parseInt(utilizationMatch[1]);
      if (util === 100) {
        return "🎯 Full fleet utilization! All vehicles active.";
      }
      if (util > 80) {
        return `✅ High fleet utilization at ${util}%. Excellent asset usage.`;
      }
      if (util < 50) {
        return `⚠️ Low fleet utilization. ${100 - util}% of vehicles idle.`;
      }
    }
    return "🚛 Fleet utilization tracking active vehicle usage.";
  }
  
  // Active drivers
  if (kpi_key === 'current.active_drivers') {
    return "👥 Active driver count shows your current workforce capacity.";
  }
  
  // Default insight
  return `📊 ${kpi.kpi_title}: ${kpi_value_human}`;
}

/**
 * Get priority score for sorting KPIs
 * Lower number = higher priority
 */
export function getKPIPriority(kpi: KPIData): number {
  const categoryInfo = getKPICategoryInfo(kpi.kpi_key);
  const changePercent = Math.abs(kpi.kpi_payload.change_percent || 0);
  
  // Critical alerts (large negative changes) get highest priority
  if (kpi.kpi_payload.change_percent && kpi.kpi_payload.change_percent < -50) {
    return 1; // Critical
  }
  
  // Warning alerts (moderate negative changes)
  if (kpi.kpi_payload.change_percent && kpi.kpi_payload.change_percent < -20) {
    return 2; // Warning
  }
  
  // Large positive changes (success stories)
  if (kpi.kpi_payload.change_percent && kpi.kpi_payload.change_percent > 50) {
    return 3; // Success
  }
  
  // Then by category priority
  return categoryInfo.priority + 10;
}

/**
 * Get urgency level for visual indicators
 */
export function getKPIUrgency(kpi: KPIData): 'critical' | 'warning' | 'success' | 'info' {
  const changePercent = kpi.kpi_payload.change_percent || 0;
  
  // Check if it's a metric where down is bad (revenue, profit, trips, distance)
  const isDownBad = kpi.kpi_key.includes('revenue') || 
                    kpi.kpi_key.includes('profit') || 
                    kpi.kpi_key.includes('trips') || 
                    kpi.kpi_key.includes('distance');
  
  if (isDownBad) {
    if (changePercent < -50) return 'critical';
    if (changePercent < -20) return 'warning';
    if (changePercent > 20) return 'success';
  }
  
  return 'info';
}

/**
 * Group KPIs by category
 */
export function groupKPIs(kpis: KPIData[]): Record<string, KPIData[]> {
  const groups: Record<string, KPIData[]> = {
    financial: [],
    activity: [],
    performance: [],
    efficiency: [],
    status: []
  };
  
  kpis.forEach(kpi => {
    const categoryInfo = getKPICategoryInfo(kpi.kpi_key);
    groups[categoryInfo.group].push(kpi);
  });
  
  return groups;
}

/**
 * Get group display info
 */
export function getGroupInfo(groupKey: string): { title: string; icon: string; description: string } {
  const groupInfoMap: Record<string, { title: string; icon: string; description: string }> = {
    financial: {
      title: 'Financial Health',
      icon: '💰',
      description: 'Revenue, profit, and P&L metrics'
    },
    activity: {
      title: 'Fleet Activity',
      icon: '🚛',
      description: 'Trips, distance, and utilization'
    },
    performance: {
      title: 'Top Performers',
      icon: '🏆',
      description: 'Rankings and achievements'
    },
    efficiency: {
      title: 'Efficiency Metrics',
      icon: '⚡',
      description: 'Fuel, cost, and optimization'
    },
    status: {
      title: 'Current Status',
      icon: '🎯',
      description: 'Real-time fleet overview'
    }
  };
  
  return groupInfoMap[groupKey] || { title: 'Other', icon: '📊', description: 'Additional metrics' };
}


