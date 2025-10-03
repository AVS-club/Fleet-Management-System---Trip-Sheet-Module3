import React from 'react';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
}

interface ReportTableProps {
  columns: Column[];
  data: any[];
  title?: string;
  className?: string;
  striped?: boolean;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  columns,
  data,
  title,
  className = "",
  striped = true
}) => {
  return (
    <div className={`report-table ${className}`}>
      {title && (
        <h2 className="text-lg font-semibold mb-4 text-gray-900">{title}</h2>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`text-${column.align || 'left'} p-3 font-medium text-gray-700`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                className={`border-b ${striped && index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`text-${column.align || 'left'} p-3`}
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
    </div>
  );
};
