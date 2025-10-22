// components/admin/DocumentCleanupTool.tsx
import React, { useState } from 'react';
import { cleanupDocumentPaths, verifyDocumentPaths } from '../../utils/documentCleanup';
import { toast } from 'react-toastify';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DocumentCleanupTool');

export const DocumentCleanupTool: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  
  const runCleanup = async () => {
    setIsRunning(true);
    setResults([]);
    
    try {
      // First verify issues
      const issues = await verifyDocumentPaths();
      if (issues && issues.length > 0) {
        setResults(prev => [...prev, `Found ${issues.length} issues`]);
        
        // Run cleanup
        const cleanupResult = await cleanupDocumentPaths();
        
        if (cleanupResult.success) {
          setResults(prev => [...prev, `Updated ${cleanupResult.updated} vehicles`]);
          
          // Verify again
          const remainingIssues = await verifyDocumentPaths();
          if (!remainingIssues || remainingIssues.length === 0) {
            setResults(prev => [...prev, 'All issues resolved successfully']);
            toast.success('Document paths cleaned successfully');
          } else {
            setResults(prev => [...prev, `${remainingIssues.length} issues remain`]);
            toast.warning('Some issues could not be resolved');
          }
        } else {
          toast.error('Cleanup failed');
        }
      } else {
        setResults(['No issues found - all paths are valid']);
        toast.info('No cleanup needed');
      }
    } catch (error) {
      logger.error('Cleanup failed:', error);
      toast.error('Cleanup failed');
      setResults(prev => [...prev, 'Error: ' + error.message]);
    } finally {
      setIsRunning(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Document Path Cleanup Tool</h3>
      
      <p className="text-gray-600 mb-4">
        This tool will clean up document paths in the database, removing any full URLs
        or bucket prefixes to ensure consistency.
      </p>
      
      <button
        onClick={runCleanup}
        disabled={isRunning}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isRunning ? 'Running...' : 'Run Cleanup'}
      </button>
      
      {results.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h4 className="font-medium mb-2">Results:</h4>
          <ul className="text-sm space-y-1">
            {results.map((result, idx) => (
              <li key={idx} className="text-gray-700">• {result}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
