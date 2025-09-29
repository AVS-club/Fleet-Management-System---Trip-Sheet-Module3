'use client'

import React, { useState } from 'react'
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-toastify'
import { LogExportOptions } from '../../types/logs'
import { exportActivityLogs } from '../../utils/api/activityLogs'

interface LogExportProps {
  onExport: (options: LogExportOptions) => Promise<void>
  disabled?: boolean
  className?: string
}

export function LogExport({ onExport, disabled = false, className = '' }: LogExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(true)
    try {
      const options: LogExportOptions = {
        type: 'vehicle', // This should be passed as prop
        format,
        filters: {
          page: 1,
          limit: 1000 // Large limit for export
        },
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date()
        }
      }

      const blob = await exportActivityLogs(options)
      
      // Download the file
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${options.type}-logs-${format(new Date(), 'yyyy-MM-dd')}.${format === 'excel' ? 'xls' : format === 'pdf' ? 'txt' : 'csv'}`
      a.click()
      window.URL.revokeObjectURL(url)
      
      setShowOptions(false)
      toast.success(`${format.toUpperCase()} export completed successfully`)
    } catch (error) {
      toast.error(`Failed to export ${format.toUpperCase()}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={disabled || isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isExporting ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Export
      </button>

      {showOptions && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
          <div className="py-1">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              Export as CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={isExporting}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export as Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <File className="w-4 h-4" />
              Export as PDF
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showOptions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  )
}

// Utility function to generate CSV content
export function generateCSVContent<T>(
  data: T[],
  columns: Array<{ key: string; label: string; formatter?: (value: any) => string }>
): string {
  const headers = columns.map(col => col.label).join(',')
  const rows = data.map(item => 
    columns.map(col => {
      const value = (item as any)[col.key]
      const formattedValue = col.formatter ? col.formatter(value) : value
      return `"${formattedValue || ''}"`
    }).join(',')
  )
  
  return [headers, ...rows].join('\n')
}

// Utility function to download file
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}
