import React, { useMemo } from 'react';
import { KPICard as KPICardType } from '../../hooks/useKPICards';
import { groupKPIs, getKPIPriority } from '../../utils/kpiInsights';
import KPIFeedSection from './KPIFeedSection';
import { TrendingUp, AlertTriangle, Trophy, Zap, Target } from 'lucide-react';

interface KPIFeedProps {
  kpis: KPICardType[];
  loading?: boolean;
}

const KPIFeed: React.FC<KPIFeedProps> = ({ kpis, loading }) => {
  // Sort KPIs by priority and group them
  const { sortedKPIs, groupedKPIs, stats } = useMemo(() => {
    if (!kpis || kpis.length === 0) {
      return { sortedKPIs: [], groupedKPIs: {}, stats: { critical: 0, warning: 0, success: 0, total: 0 } };
    }

    // Sort by priority
    const sorted = [...kpis].sort((a, b) => {
      return getKPIPriority(a) - getKPIPriority(b);
    });

    // Group by category
    const grouped = groupKPIs(sorted);

    // Calculate stats
    const stats = {
      critical: kpis.filter(k => {
        const change = k.kpi_payload.change_percent || 0;
        return change < -50;
      }).length,
      warning: kpis.filter(k => {
        const change = k.kpi_payload.change_percent || 0;
        return change < -20 && change >= -50;
      }).length,
      success: kpis.filter(k => {
        const change = k.kpi_payload.change_percent || 0;
        return change > 50;
      }).length,
      total: kpis.length
    };

    return { sortedKPIs: sorted, groupedKPIs: grouped, stats };
  }, [kpis]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!kpis || kpis.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <div className="text-gray-400 dark:text-gray-500 mb-3">
          <TrendingUp className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No KPIs Available
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          KPIs will appear here once they're generated
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.critical > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.critical}</div>
                <div className="text-xs text-red-600 dark:text-red-400">Critical</div>
              </div>
            </div>
          </div>
        )}
        
        {stats.warning > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <div>
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.warning}</div>
                <div className="text-xs text-orange-600 dark:text-orange-400">Warnings</div>
              </div>
            </div>
          </div>
        )}
        
        {stats.success > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.success}</div>
                <div className="text-xs text-green-600 dark:text-green-400">Wins</div>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">Total KPIs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped KPI Sections */}
      <div className="space-y-6">
        {/* Financial Health - Most Important */}
        {groupedKPIs.financial && groupedKPIs.financial.length > 0 && (
          <KPIFeedSection
            groupKey="financial"
            kpis={groupedKPIs.financial}
            defaultExpanded={true}
          />
        )}

        {/* Fleet Activity */}
        {groupedKPIs.activity && groupedKPIs.activity.length > 0 && (
          <KPIFeedSection
            groupKey="activity"
            kpis={groupedKPIs.activity}
            defaultExpanded={true}
          />
        )}

        {/* Top Performers */}
        {groupedKPIs.performance && groupedKPIs.performance.length > 0 && (
          <KPIFeedSection
            groupKey="performance"
            kpis={groupedKPIs.performance}
            defaultExpanded={true}
          />
        )}

        {/* Efficiency Metrics */}
        {groupedKPIs.efficiency && groupedKPIs.efficiency.length > 0 && (
          <KPIFeedSection
            groupKey="efficiency"
            kpis={groupedKPIs.efficiency}
            defaultExpanded={true}
          />
        )}

        {/* Current Status */}
        {groupedKPIs.status && groupedKPIs.status.length > 0 && (
          <KPIFeedSection
            groupKey="status"
            kpis={groupedKPIs.status}
            defaultExpanded={false}
          />
        )}
      </div>
    </div>
  );
};

export default KPIFeed;

