import React, { ReactNode } from 'react';
import { FileSpreadsheet, CalendarDays, Hash, ListChecks, Database } from 'lucide-react';

interface ExcelFormatTipsProps {
  className?: string;
  headerAction?: ReactNode;
}

const TIPS = [
  {
    icon: FileSpreadsheet,
    title: 'Keep headers intact',
    description:
      'Use the exact header row from the exported template: Trip ID, Vehicle, Driver, Start Date, End Date, Distance, Fuel (L), Expenses.'
  },
  {
    icon: CalendarDays,
    title: 'Dates in YYYY-MM-DD',
    description: 'Format every date cell as YYYY-MM-DD. Mixed date formats or text like "14th Nov" will be rejected.'
  },
  {
    icon: Hash,
    title: 'Numbers only',
    description: 'Distance, weight, fuel, and expenses should be pure numbers without units or commas.'
  },
  {
    icon: ListChecks,
    title: 'No merged cells',
    description: 'Avoid merged cells, blank header rows, or filters. A clean sheet ensures faster parsing.'
  },
  {
    icon: Database,
    title: 'Match master data',
    description: 'Driver and vehicle IDs must match what you see in exports to avoid orphaned trips.'
  }
];

const ExcelFormatTips: React.FC<ExcelFormatTipsProps> = ({ className, headerAction }) => {
  const actionNode =
    headerAction === undefined ? (
      <span className="text-xs font-semibold text-blue-600">Swipe</span>
    ) : (
      headerAction
    );

  return (
    <section className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className || ''}`}>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Excel import tips</p>
          <p className="text-xs text-gray-500">Follow these basics before uploading a sheet.</p>
        </div>
        {actionNode}
      </div>
      <div className="flex gap-4 overflow-x-auto px-4 py-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
        {TIPS.map(tip => (
          <div
            key={tip.title}
            className="min-w-[220px] snap-start rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm"
          >
            <tip.icon className="h-6 w-6 text-blue-500" />
            <p className="mt-3 text-sm font-semibold text-gray-900">{tip.title}</p>
            <p className="mt-1 text-xs text-gray-600 leading-relaxed">{tip.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExcelFormatTips;
