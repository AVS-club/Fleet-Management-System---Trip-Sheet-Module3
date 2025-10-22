/**
 * Custom hook to manage Vehicle Form state
 *
 * Extracts all the complex state management logic from VehicleForm component
 * including document upload/delete tracking, draft state, and form data.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Vehicle } from '@/types';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('useVehicleFormState');

interface DraftState {
  isDraft: boolean;
  originalDocuments: Record<string, string[]>;
  pendingUploads: Record<string, File[]>;
  pendingDeletions: Record<string, string[]>;
  pendingNewUploads: Record<string, string[]>;
}

interface StagedDocument {
  files: File[];
  existingPaths: string[];
}

export interface UseVehicleFormStateProps {
  initialData?: Partial<Vehicle>;
}

export function useVehicleFormState({ initialData = {} }: UseVehicleFormStateProps = {}) {
  // Form state
  const formMethods = useForm<Vehicle>({
    defaultValues: initialData as Vehicle,
  });

  // Document management state
  const [stagedDocuments, setStagedDocuments] = useState<Record<string, StagedDocument>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [deletedDocuments, setDeletedDocuments] = useState<Record<string, string[]>>({});

  // Draft state management
  const [draftState, setDraftState] = useState<DraftState>({
    isDraft: false,
    originalDocuments: {},
    pendingUploads: {},
    pendingDeletions: {},
    pendingNewUploads: {}
  });

  // UI state
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');

  /**
   * Stage files for upload without immediately uploading them
   */
  const stageDocuments = (docType: string, files: File[], existingPaths: string[] = []) => {
    logger.debug(`Staging documents for ${docType}:`, { files: files.length, existing: existingPaths.length });

    setStagedDocuments(prev => ({
      ...prev,
      [docType]: {
        files,
        existingPaths
      }
    }));
  };

  /**
   * Mark documents for deletion
   */
  const markForDeletion = (docType: string, paths: string[]) => {
    logger.debug(`Marking ${docType} documents for deletion:`, paths);

    setDeletedDocuments(prev => ({
      ...prev,
      [docType]: [...(prev[docType] || []), ...paths]
    }));

    setDraftState(prev => ({
      ...prev,
      isDraft: true,
      pendingDeletions: {
        ...prev.pendingDeletions,
        [docType]: [...(prev.pendingDeletions[docType] || []), ...paths]
      }
    }));
  };

  /**
   * Clear all staged documents and draft state
   */
  const clearDraftState = () => {
    logger.debug('Clearing draft state');

    setStagedDocuments({});
    setUploadProgress({});
    setDeletedDocuments({});
    setDraftState({
      isDraft: false,
      originalDocuments: {},
      pendingUploads: {},
      pendingDeletions: {},
      pendingNewUploads: {}
    });
  };

  /**
   * Update upload progress for a document type
   */
  const updateUploadProgress = (docType: string, progress: number) => {
    setUploadProgress(prev => ({
      ...prev,
      [docType]: progress
    }));
  };

  return {
    // Form methods
    ...formMethods,

    // Document state
    stagedDocuments,
    uploadProgress,
    deletedDocuments,
    draftState,

    // UI state
    isFetching,
    setIsFetching,
    fetchStatus,
    setFetchStatus,

    // Actions
    stageDocuments,
    markForDeletion,
    clearDraftState,
    updateUploadProgress,
  };
}
