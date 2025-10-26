import React, { useState } from 'react';
import { Download, CheckSquare, Square } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import Button from '../ui/Button';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DocumentModalBase');

export interface DocumentItemBase {
  id: string;
  name: string;
  url?: string;
  selected: boolean;
  status: 'available' | 'missing' | string;
}

interface DocumentModalBaseProps<T extends DocumentItemBase> {
  documents: T[];
  setDocuments: React.Dispatch<React.SetStateAction<T[]>>;
  entityName: string;
  onClose: () => void;
  renderActions: (doc: T) => React.ReactNode;
  renderStatus?: (doc: T) => React.ReactNode;
}

const DocumentModalBase = <T extends DocumentItemBase>(
  {
    documents,
    setDocuments,
    entityName,
    onClose,
    renderActions,
    renderStatus,
  }: DocumentModalBaseProps<T>
) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const toggleDocumentSelection = (id: string) => {
    setDocuments(docs =>
      docs.map(doc =>
        doc.id === id && doc.url ? { ...doc, selected: !doc.selected } : doc
      )
    );
  };

  const selectAll = () => {
    setDocuments(docs => docs.map(doc => ({ ...doc, selected: !!doc.url })));
  };

  const deselectAll = () => {
    setDocuments(docs => docs.map(doc => ({ ...doc, selected: false })));
  };

  const handleDownload = async () => {
    const selectedDocs = documents.filter(doc => doc.selected && doc.url);
    if (selectedDocs.length === 0) return;

    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${entityName}_documents`);
      if (!folder) {
        throw new Error('Failed to create zip folder');
      }

      await Promise.all(
        selectedDocs.map(async doc => {
          if (!doc.url) return;
          try {
            const response = await fetch(doc.url);
            if (!response.ok) throw new Error(`Failed to fetch ${doc.name}`);
            const blob = await response.blob();
            const contentType = response.headers.get('content-type');
            let fileExt = 'pdf';
            if (contentType) {
              if (contentType.includes('image/jpeg')) fileExt = 'jpg';
              else if (contentType.includes('image/png')) fileExt = 'png';
              else if (contentType.includes('application/pdf')) fileExt = 'pdf';
            }
            const safeName = doc.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${safeName}.${fileExt}`;
            folder.file(fileName, blob);
          } catch (error) {
            logger.error(`Error downloading ${doc.name}:`, error);
          }
        })
      );

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${entityName}_documents.zip`);
    } catch (error) {
      logger.error('Error creating zip file:', error);
      toast.error('Failed to download documents');
    } finally {
      setIsDownloading(false);
    }
  };

  const anySelected = documents.some(doc => doc.selected);
  const anyDocumentsAvailable = documents.some(doc => doc.url);

  return (
    <>
      <div className="p-4">
        <div className="mb-4 flex justify-between">
          <div className="space-x-2">
            <Button
              variant="outline"
              inputSize="sm"
              onClick={selectAll}
              disabled={!anyDocumentsAvailable}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              inputSize="sm"
              onClick={deselectAll}
              disabled={!anyDocumentsAvailable}
            >
              Deselect All
            </Button>
          </div>
        </div>

        <div className="border rounded-lg max-h-[300px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-[40px] px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document Type
                </th>
                <th scope="col" className="w-[80px] px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="w-[80px] px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map(doc => (
                <tr key={doc.id} className={!doc.url ? 'bg-gray-50' : ''}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      type="button"
                      className={`${!doc.url ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      onClick={() => doc.url && toggleDocumentSelection(doc.id)}
                      disabled={!doc.url}
                      title={doc.url ? 'Select document' : 'Document not available'}
                    >
                      {doc.selected && doc.url ? (
                        <CheckSquare className="h-5 w-5 text-primary-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm ${!doc.url ? 'text-gray-400' : 'text-gray-900'}`}>
                    {doc.name}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {renderStatus ? (
                      renderStatus(doc)
                    ) : (
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          doc.status === 'available'
                            ? 'bg-success-100 text-success-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {doc.status === 'available' ? 'Available' : 'Missing'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex justify-center items-center space-x-3">
                      {renderActions(doc)}
                    </div>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                    <Download className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    No documents available for download
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose} disabled={isDownloading}>
          Cancel
        </Button>
        <Button
          onClick={handleDownload}
          disabled={!anySelected || isDownloading}
          isLoading={isDownloading}
          icon={<Download className="h-4 w-4" />}
        >
          Download Selected
        </Button>
      </div>
    </>
  );
};

export default DocumentModalBase;
