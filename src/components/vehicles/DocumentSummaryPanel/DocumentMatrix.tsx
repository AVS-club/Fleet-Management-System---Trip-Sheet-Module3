/**
 * DocumentMatrix - Table showing document status for all vehicles
 *
 * Features:
 * - Virtual scrolling for large datasets (>50 vehicles)
 * - Column sorting with visual indicators
 * - Urgency-based row highlighting
 * - Document status cells with expiry dates
 * - Sticky vehicle number column
 */

import React from 'react';
import { Vehicle } from '@/types';
import { DocumentCell } from '../../documents/DocumentCell';
import { format, parseISO } from 'date-fns';
import { DocKey } from '../../../utils/urgency';

// Import react-window with fallback
let FixedSizeList: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const reactWindow = require('react-window');
  FixedSizeList = reactWindow.FixedSizeList;
} catch {
  // Fallback to regular table rendering if react-window is not available
}

interface DocumentInfo {
  date: string | null;
  status: 'expired' | 'expiring' | 'valid' | 'missing';
}

interface VehicleDocuments {
  id: string;
  registration: string;
  registrationDate: string | null;
  documents: {
    rc: DocumentInfo;
    insurance: DocumentInfo;
    fitness: DocumentInfo;
    permit: DocumentInfo;
    puc: DocumentInfo;
    tax: DocumentInfo;
  };
  __urg: {
    score: number;
    meta: {
      expired: number;
      minDTX: number | null;
      missing: number;
    };
  };
}

type SortMode =
  | { kind: "urgency" }
  | { kind: "expiringSoon" }
  | { kind: "missing" }
  | { kind: "legalPriority" }
  | { kind: "column"; column: DocKey; dir: "asc" | "desc" };

interface DocumentMatrixProps {
  sortedDocumentMatrix: VehicleDocuments[];
  vehicles: Vehicle[];
  visibleColumns: string[];
  documentTypeFilter: string;
  sort: SortMode;
  onColumnSort: (column: DocKey) => void;
}

export const DocumentMatrix: React.FC<DocumentMatrixProps> = ({
  sortedDocumentMatrix,
  vehicles,
  visibleColumns,
  documentTypeFilter,
  sort,
  onColumnSort
}) => {
  /**
   * Render a single vehicle row
   */
  const renderVehicleRow = (vehicle: VehicleDocuments, style?: React.CSSProperties) => {
    const vehicleData = vehicles.find(v => v.id === vehicle.id);

    return (
      <div
        style={{
          ...style,
          background: vehicle.__urg.score > 2
            ? 'linear-gradient(90deg, #fef2f2 0%, transparent 100%)'
            : vehicle.__urg.meta.minDTX !== null && vehicle.__urg.meta.minDTX <= 30 && vehicle.__urg.meta.minDTX >= 0
              ? 'linear-gradient(90deg, #fffbeb 0%, transparent 100%)'
              : 'transparent'
        }}
        className="flex items-center border-b border-gray-200 hover:bg-gray-50"
      >
        {/* Vehicle Number Column - Sticky */}
        <div className="px-3 py-2 w-40 flex-shrink-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {vehicle.registration}
          </div>
          {vehicleData?.vahan_last_fetched_at && (
            <div className="text-xs text-blue-600">
              {format(parseISO(vehicleData.vahan_last_fetched_at), 'MMM d, HH:mm')}
            </div>
          )}
        </div>

        {/* Insurance Column */}
        {visibleColumns.includes('insurance') && (documentTypeFilter === 'all' || documentTypeFilter === 'insurance') && (
          <div className="px-2 py-2 w-24 flex-shrink-0 text-center">
            <DocumentCell
              vehicleId={vehicle.id}
              vehicleNumber={vehicle.registration}
              docKind="insurance"
              expiryDate={vehicle.documents.insurance.date}
              docPaths={vehicleData?.insurance_document_url ? [vehicleData.insurance_document_url] : null}
              preferredFormat="short"
            />
          </div>
        )}

        {/* Fitness Column */}
        {visibleColumns.includes('fitness') && (documentTypeFilter === 'all' || documentTypeFilter === 'fitness') && (
          <div className="px-2 py-2 w-24 flex-shrink-0 text-center">
            <DocumentCell
              vehicleId={vehicle.id}
              vehicleNumber={vehicle.registration}
              docKind="fitness"
              expiryDate={vehicle.documents.fitness.date}
              docPaths={vehicleData?.fitness_document_url ? [vehicleData.fitness_document_url] : null}
              preferredFormat="short"
            />
          </div>
        )}

        {/* Permit Column */}
        {visibleColumns.includes('permit') && (documentTypeFilter === 'all' || documentTypeFilter === 'permit') && (
          <div className="px-2 py-2 w-24 flex-shrink-0 text-center">
            <DocumentCell
              vehicleId={vehicle.id}
              vehicleNumber={vehicle.registration}
              docKind="permit"
              expiryDate={vehicle.documents.permit.date}
              docPaths={vehicleData?.permit_document_url ? [vehicleData.permit_document_url] : null}
              preferredFormat="short"
            />
          </div>
        )}

        {/* PUC Column */}
        {visibleColumns.includes('puc') && (documentTypeFilter === 'all' || documentTypeFilter === 'puc') && (
          <div className="px-2 py-2 w-24 flex-shrink-0 text-center">
            <DocumentCell
              vehicleId={vehicle.id}
              vehicleNumber={vehicle.registration}
              docKind="puc"
              expiryDate={vehicle.documents.puc.date}
              docPaths={vehicleData?.puc_document_url ? [vehicleData.puc_document_url] : null}
              preferredFormat="short"
            />
          </div>
        )}

        {/* Tax Column */}
        {visibleColumns.includes('tax') && (documentTypeFilter === 'all' || documentTypeFilter === 'tax') && (
          <div className="px-2 py-2 w-24 flex-shrink-0 text-center">
            <DocumentCell
              vehicleId={vehicle.id}
              vehicleNumber={vehicle.registration}
              docKind="tax"
              expiryDate={vehicle.documents.tax.date}
              docPaths={vehicleData?.tax_document_url ? [vehicleData.tax_document_url] : null}
              preferredFormat="short"
            />
          </div>
        )}

        {/* RC Column */}
        {visibleColumns.includes('rc_expiry') && (documentTypeFilter === 'all' || documentTypeFilter === 'rc') && (
          <div className="px-2 py-2 w-24 flex-shrink-0 text-center bg-blue-50">
            <DocumentCell
              vehicleId={vehicle.id}
              vehicleNumber={vehicle.registration}
              docKind="rc"
              expiryDate={vehicle.documents.rc.date}
              docPaths={vehicleData?.rc_document_url ? [vehicleData.rc_document_url] : null}
              preferredFormat="short"
            />
            {vehicle.registrationDate && (
              <div className="text-xs text-gray-400">
                (15y)
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /**
   * Render column header with sorting
   */
  const renderColumnHeader = (column: DocKey, label: string) => {
    const isActive = sort.kind === "column" && sort.column === column;

    return (
      <th
        onClick={() => onColumnSort(column)}
        className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] sortable-header cursor-pointer hover:bg-gray-100"
        style={{
          textDecoration: isActive ? 'underline' : 'none'
        }}
      >
        {label}
        {isActive && (
          <span style={{ marginLeft: '4px', fontSize: '12px' }}>
            {sort.dir === "asc" ? '↑' : '↓'}
          </span>
        )}
      </th>
    );
  };

  // Virtual scrolling for large datasets
  if (sortedDocumentMatrix.length > 50 && FixedSizeList) {
    return (
      <div className="h-96">
        <FixedSizeList
          height={384}
          itemCount={sortedDocumentMatrix.length}
          itemSize={48}
          width="100%"
        >
          {({ index, style }) => renderVehicleRow(sortedDocumentMatrix[index], style)}
        </FixedSizeList>
      </div>
    );
  }

  // Regular table for smaller datasets
  return (
    <div className="document-table-wrapper">
      <table className="min-w-full divide-y divide-gray-200 document-table">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] sticky left-0 bg-gray-50 z-10 vehicle-number-cell">
              Vehicle Number
            </th>
            {visibleColumns.includes('insurance') && (documentTypeFilter === 'all' || documentTypeFilter === 'insurance') &&
              renderColumnHeader("insurance", "Insurance")
            }
            {visibleColumns.includes('fitness') && (documentTypeFilter === 'all' || documentTypeFilter === 'fitness') &&
              renderColumnHeader("fitness", "Fitness")
            }
            {visibleColumns.includes('permit') && (documentTypeFilter === 'all' || documentTypeFilter === 'permit') &&
              renderColumnHeader("permit", "Permit")
            }
            {visibleColumns.includes('puc') && (documentTypeFilter === 'all' || documentTypeFilter === 'puc') &&
              renderColumnHeader("puc", "PUC")
            }
            {visibleColumns.includes('tax') && (documentTypeFilter === 'all' || documentTypeFilter === 'tax') &&
              renderColumnHeader("tax", "Tax")
            }
            {visibleColumns.includes('rc_expiry') && (documentTypeFilter === 'all' || documentTypeFilter === 'rc') &&
              renderColumnHeader("rc", "RC Expiry")
            }
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedDocumentMatrix.map(vehicle => (
            <tr
              key={vehicle.id}
              style={{
                background: vehicle.__urg.score > 2
                  ? 'linear-gradient(90deg, #fef2f2 0%, transparent 100%)'
                  : vehicle.__urg.meta.minDTX !== null && vehicle.__urg.meta.minDTX <= 30 && vehicle.__urg.meta.minDTX >= 0
                    ? 'linear-gradient(90deg, #fffbeb 0%, transparent 100%)'
                    : 'transparent'
              }}
              className="hover:bg-gray-50"
            >
              {/* Vehicle Number Column */}
              <td className="px-3 py-2 sticky left-0 bg-white z-10 vehicle-number-cell">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {vehicle.registration}
                </div>
                {vehicles.find(v => v.id === vehicle.id)?.vahan_last_fetched_at && (
                  <div className="text-xs text-blue-600">
                    {format(parseISO(vehicles.find(v => v.id === vehicle.id)!.vahan_last_fetched_at!), 'MMM d, HH:mm')}
                  </div>
                )}
              </td>

              {/* Document Columns */}
              {visibleColumns.includes('insurance') && (documentTypeFilter === 'all' || documentTypeFilter === 'insurance') && (
                <td className="px-2 py-2 text-center">
                  <DocumentCell
                    vehicleId={vehicle.id}
                    vehicleNumber={vehicle.registration}
                    docKind="insurance"
                    expiryDate={vehicle.documents.insurance.date}
                    docPaths={vehicles.find(v => v.id === vehicle.id)?.insurance_document_url ? [vehicles.find(v => v.id === vehicle.id)!.insurance_document_url!] : null}
                    preferredFormat="short"
                  />
                </td>
              )}

              {visibleColumns.includes('fitness') && (documentTypeFilter === 'all' || documentTypeFilter === 'fitness') && (
                <td className="px-2 py-2 text-center">
                  <DocumentCell
                    vehicleId={vehicle.id}
                    vehicleNumber={vehicle.registration}
                    docKind="fitness"
                    expiryDate={vehicle.documents.fitness.date}
                    docPaths={vehicles.find(v => v.id === vehicle.id)?.fitness_document_url ? [vehicles.find(v => v.id === vehicle.id)!.fitness_document_url!] : null}
                    preferredFormat="short"
                  />
                </td>
              )}

              {visibleColumns.includes('permit') && (documentTypeFilter === 'all' || documentTypeFilter === 'permit') && (
                <td className="px-2 py-2 text-center">
                  <DocumentCell
                    vehicleId={vehicle.id}
                    vehicleNumber={vehicle.registration}
                    docKind="permit"
                    expiryDate={vehicle.documents.permit.date}
                    docPaths={vehicles.find(v => v.id === vehicle.id)?.permit_document_url ? [vehicles.find(v => v.id === vehicle.id)!.permit_document_url!] : null}
                    preferredFormat="short"
                  />
                </td>
              )}

              {visibleColumns.includes('puc') && (documentTypeFilter === 'all' || documentTypeFilter === 'puc') && (
                <td className="px-2 py-2 text-center">
                  <DocumentCell
                    vehicleId={vehicle.id}
                    vehicleNumber={vehicle.registration}
                    docKind="puc"
                    expiryDate={vehicle.documents.puc.date}
                    docPaths={vehicles.find(v => v.id === vehicle.id)?.puc_document_url ? [vehicles.find(v => v.id === vehicle.id)!.puc_document_url!] : null}
                    preferredFormat="short"
                  />
                </td>
              )}

              {visibleColumns.includes('tax') && (documentTypeFilter === 'all' || documentTypeFilter === 'tax') && (
                <td className="px-2 py-2 text-center">
                  <DocumentCell
                    vehicleId={vehicle.id}
                    vehicleNumber={vehicle.registration}
                    docKind="tax"
                    expiryDate={vehicle.documents.tax.date}
                    docPaths={vehicles.find(v => v.id === vehicle.id)?.tax_document_url ? [vehicles.find(v => v.id === vehicle.id)!.tax_document_url!] : null}
                    preferredFormat="short"
                  />
                </td>
              )}

              {visibleColumns.includes('rc_expiry') && (documentTypeFilter === 'all' || documentTypeFilter === 'rc') && (
                <td className="px-2 py-2 text-center bg-blue-50">
                  <DocumentCell
                    vehicleId={vehicle.id}
                    vehicleNumber={vehicle.registration}
                    docKind="rc"
                    expiryDate={vehicle.documents.rc.date}
                    docPaths={vehicles.find(v => v.id === vehicle.id)?.rc_document_url ? [vehicles.find(v => v.id === vehicle.id)!.rc_document_url!] : null}
                    preferredFormat="short"
                  />
                  {vehicle.registrationDate && (
                    <div className="text-xs text-gray-400">
                      (15y)
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
