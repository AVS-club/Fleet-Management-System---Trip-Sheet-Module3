'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface LogTableProps<T> {
  data: T[]
  columns: Array<{
    key: string
    label: string
    render?: (item: T) => React.ReactNode
    className?: string
  }>
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (item: T) => void
  lastElementRef?: (node: HTMLElement | null) => void
  isLastRow?: (index: number) => boolean
}

export function LogTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data found',
  onRowClick,
  lastElementRef,
  isLastRow
}: LogTableProps<T>) {
  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
        <span className="ml-2 text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${column.className || ''}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
          {data.map((item, index) => (
            <tr
              key={item.id}
              ref={isLastRow && isLastRow(index) ? lastElementRef : null}
              className={`hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 ${column.className || ''}`}
                >
                  {column.render ? column.render(item) : (item as any)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
