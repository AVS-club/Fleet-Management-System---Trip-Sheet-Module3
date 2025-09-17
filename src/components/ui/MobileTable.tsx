import React from 'react';
import { cn } from '../../utils/cn';

interface MobileTableColumn {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
  mobileHidden?: boolean;
}

interface MobileTableProps {
  columns: MobileTableColumn[];
  data: any[];
  className?: string;
  mobileView?: 'cards' | 'table';
  cardTitle?: (row: any) => string;
  cardSubtitle?: (row: any) => string;
}

const MobileTable: React.FC<MobileTableProps> = ({
  columns,
  data,
  className,
  mobileView = 'cards',
  cardTitle,
  cardSubtitle
}) => {
  const visibleColumns = columns.filter(col => !col.mobileHidden);

  // Mobile card view
  if (mobileView === 'cards') {
    return (
      <div className={cn('space-y-4', className)}>
        {data.map((row, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
          >
            {/* Card Header */}
            {(cardTitle || cardSubtitle) && (
              <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                {cardTitle && (
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {cardTitle(row)}
                  </h3>
                )}
                {cardSubtitle && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {cardSubtitle(row)}
                  </p>
                )}
              </div>
            )}

            {/* Card Content */}
            <div className="space-y-2">
              {visibleColumns.map((column) => (
                <div key={column.key} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {column.label}:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {column.render 
                      ? column.render(row[column.key], row)
                      : row[column.key]
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {visibleColumns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider',
                  column.className
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              {visibleColumns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100',
                    column.className
                  )}
                >
                  {column.render 
                    ? column.render(row[column.key], row)
                    : row[column.key]
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MobileTable;
