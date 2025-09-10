import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, Trash2, Search } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onDelete?: (id: string) => void;
  onDownloadTemplate?: () => void;
  searchPlaceholder?: string;
  itemsPerPage?: number;
  searchKeys?: string[];
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  onDelete,
  onDownloadTemplate,
  searchPlaceholder = 'Search...',
  itemsPerPage = 10,
  searchKeys,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Add ref for scrollable container
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Handle scroll detection for indicator
  useEffect(() => {
    const handleScroll = () => {
      if (!tableContainerRef.current) return;
      
      const { scrollLeft } = tableContainerRef.current;
      
      // Check if scrolled at all
      if (scrollLeft > 0) {
        tableContainerRef.current.classList.add('scrolled-right');
      } else {
        tableContainerRef.current.classList.remove('scrolled-right');
      }
    };
    
    const tableContainer = tableContainerRef.current;
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (tableContainer) {
        tableContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm) return data;
    const term = debouncedSearchTerm.toLowerCase();
    const keys = searchKeys ?? columns.map(c => c.key);
    return data.filter(item =>
      keys.some(key => String(item[key] ?? '').toLowerCase().includes(term))
    );
  }, [data, debouncedSearchTerm, searchKeys, columns]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      onDelete?.(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
        <div className="w-full sm:w-60">
          <Input
            placeholder={searchPlaceholder}
            icon={<Search className="h-4 w-4" />}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {onDownloadTemplate && (
          <Button
            variant="outline"
            onClick={onDownloadTemplate}
            className="w-full sm:w-auto"
            icon={<Download className="h-4 w-4" />}
          >
            Download Template
          </Button>
        )}
      </div>

      <div className="overflow-x-auto scroll-indicator" ref={tableContainerRef}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
              {onDelete && (
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {onDelete && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="text-error-600 hover:text-error-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              variant="outline"
              inputSize="sm"
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              inputSize="sm"
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(startIndex + itemsPerPage, filteredData.length)}
                </span>{' '}
                of <span className="font-medium">{filteredData.length}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm text-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-1.5 sm:px-2 py-1 sm:py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-1.5 sm:px-2 py-1 sm:py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;