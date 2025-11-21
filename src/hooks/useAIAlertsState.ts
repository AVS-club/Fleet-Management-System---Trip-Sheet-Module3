/**
 * Consolidated state management for AI Alerts
 * Reduces multiple useState calls and improves performance
 */

import { useReducer, useCallback, useMemo } from 'react';
import { AIAlert } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useAIAlertsState');

// Action types
enum ActionType {
  SET_ACTIVE_TAB = 'SET_ACTIVE_TAB',
  SET_FILTERS = 'SET_FILTERS',
  UPDATE_FILTER = 'UPDATE_FILTER',
  RESET_FILTERS = 'RESET_FILTERS',
  SET_SELECTED_FILTERS = 'SET_SELECTED_FILTERS',
  TOGGLE_FILTER = 'TOGGLE_FILTER',
  SET_VIEW_OPTIONS = 'SET_VIEW_OPTIONS',
  UPDATE_VIEW_OPTION = 'UPDATE_VIEW_OPTION',
  SET_MODAL = 'SET_MODAL',
  CLOSE_MODAL = 'CLOSE_MODAL',
  SET_LOADING = 'SET_LOADING',
  SET_ERROR = 'SET_ERROR',
  SET_DATA = 'SET_DATA',
  SET_REFRESH_STATE = 'SET_REFRESH_STATE',
  BATCH_UPDATE = 'BATCH_UPDATE'
}

// State interface
interface AIAlertsState {
  // Tab state
  activeTab: 'all-feed' | 'alerts' | 'driver-insights';
  
  // Filter state
  filters: {
    search: string;
    type: string;
    severity: string;
    vehicle: string;
    status: string;
  };
  selectedFilters: string[];
  
  // View options
  viewOptions: {
    showVideos: boolean;
    includeDocuments: boolean;
    showFutureEvents: boolean;
    showDemoInsights: boolean;
    groupByVehicle: boolean;
  };
  
  // Modal state
  modal: {
    type: 'action' | 'details' | null;
    data: any;
  };
  
  // Loading states
  loading: {
    main: boolean;
    refresh: boolean;
    scan: boolean;
  };
  
  // Error state
  error: string | null;
  
  // Data state
  alerts: AIAlert[];
  selectedAlert: AIAlert | null;
  
  // Refresh state
  lastUpdated: Date;
  isRefreshing: boolean;
}

// Action interfaces
type Action =
  | { type: ActionType.SET_ACTIVE_TAB; payload: AIAlertsState['activeTab'] }
  | { type: ActionType.SET_FILTERS; payload: Partial<AIAlertsState['filters']> }
  | { type: ActionType.UPDATE_FILTER; payload: { key: keyof AIAlertsState['filters']; value: string } }
  | { type: ActionType.RESET_FILTERS }
  | { type: ActionType.SET_SELECTED_FILTERS; payload: string[] }
  | { type: ActionType.TOGGLE_FILTER; payload: string }
  | { type: ActionType.SET_VIEW_OPTIONS; payload: Partial<AIAlertsState['viewOptions']> }
  | { type: ActionType.UPDATE_VIEW_OPTION; payload: { key: keyof AIAlertsState['viewOptions']; value: boolean } }
  | { type: ActionType.SET_MODAL; payload: AIAlertsState['modal'] }
  | { type: ActionType.CLOSE_MODAL }
  | { type: ActionType.SET_LOADING; payload: { key: keyof AIAlertsState['loading']; value: boolean } }
  | { type: ActionType.SET_ERROR; payload: string | null }
  | { type: ActionType.SET_DATA; payload: { alerts?: AIAlert[]; selectedAlert?: AIAlert | null } }
  | { type: ActionType.SET_REFRESH_STATE; payload: { isRefreshing: boolean; lastUpdated?: Date } }
  | { type: ActionType.BATCH_UPDATE; payload: Partial<AIAlertsState> };

// Initial state
const initialState: AIAlertsState = {
  activeTab: 'all-feed',
  filters: {
    search: '',
    type: 'all',
    severity: 'all',
    vehicle: 'all',
    status: 'pending'
  },
  selectedFilters: ['all'],
  viewOptions: {
    showVideos: true,
    includeDocuments: false,
    showFutureEvents: false,
    showDemoInsights: true,
    groupByVehicle: false
  },
  modal: {
    type: null,
    data: null
  },
  loading: {
    main: true,
    refresh: false,
    scan: false
  },
  error: null,
  alerts: [],
  selectedAlert: null,
  lastUpdated: new Date(),
  isRefreshing: false
};

// Reducer function
function aiAlertsReducer(state: AIAlertsState, action: Action): AIAlertsState {
  switch (action.type) {
    case ActionType.SET_ACTIVE_TAB:
      return { ...state, activeTab: action.payload };
      
    case ActionType.SET_FILTERS:
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload } 
      };
      
    case ActionType.UPDATE_FILTER:
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.key]: action.payload.value
        }
      };
      
    case ActionType.RESET_FILTERS:
      return {
        ...state,
        filters: initialState.filters
      };
      
    case ActionType.SET_SELECTED_FILTERS:
      return { ...state, selectedFilters: action.payload };
      
    case ActionType.TOGGLE_FILTER:
      const filter = action.payload;
      const currentFilters = state.selectedFilters;
      
      if (filter === 'all') {
        return { ...state, selectedFilters: ['all'] };
      }
      
      const withoutAll = currentFilters.filter(f => f !== 'all');
      const isSelected = withoutAll.includes(filter);
      
      const newFilters = isSelected
        ? withoutAll.filter(f => f !== filter)
        : [...withoutAll, filter];
        
      return {
        ...state,
        selectedFilters: newFilters.length === 0 ? ['all'] : newFilters
      };
      
    case ActionType.SET_VIEW_OPTIONS:
      return {
        ...state,
        viewOptions: { ...state.viewOptions, ...action.payload }
      };
      
    case ActionType.UPDATE_VIEW_OPTION:
      // Save to localStorage for persistence
      const newValue = action.payload.value;
      try {
        localStorage.setItem(action.payload.key, JSON.stringify(newValue));
      } catch (e) {
        logger.warn('Failed to save view option to localStorage:', e);
      }
      
      return {
        ...state,
        viewOptions: {
          ...state.viewOptions,
          [action.payload.key]: newValue
        }
      };
      
    case ActionType.SET_MODAL:
      return { ...state, modal: action.payload };
      
    case ActionType.CLOSE_MODAL:
      return {
        ...state,
        modal: { type: null, data: null }
      };
      
    case ActionType.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value
        }
      };
      
    case ActionType.SET_ERROR:
      return { ...state, error: action.payload };
      
    case ActionType.SET_DATA:
      return {
        ...state,
        alerts: action.payload.alerts ?? state.alerts,
        selectedAlert: action.payload.selectedAlert !== undefined 
          ? action.payload.selectedAlert 
          : state.selectedAlert
      };
      
    case ActionType.SET_REFRESH_STATE:
      return {
        ...state,
        isRefreshing: action.payload.isRefreshing,
        lastUpdated: action.payload.lastUpdated ?? state.lastUpdated
      };
      
    case ActionType.BATCH_UPDATE:
      return { ...state, ...action.payload };
      
    default:
      return state;
  }
}

/**
 * Custom hook for AI Alerts state management
 */
export function useAIAlertsState() {
  // Load initial state from localStorage
  const loadInitialState = (): AIAlertsState => {
    const state = { ...initialState };
    
    try {
      // Load view options from localStorage
      const storedOptions = ['showVideos', 'includeDocuments', 'showFutureEvents', 'showDemoInsights'];
      storedOptions.forEach(key => {
        const stored = localStorage.getItem(key);
        if (stored !== null) {
          (state.viewOptions as any)[key] = JSON.parse(stored);
        }
      });
    } catch (e) {
      logger.warn('Failed to load state from localStorage:', e);
    }
    
    return state;
  };

  const [state, dispatch] = useReducer(aiAlertsReducer, null, loadInitialState);

  // Action creators
  const actions = useMemo(() => ({
    setActiveTab: (tab: AIAlertsState['activeTab']) => 
      dispatch({ type: ActionType.SET_ACTIVE_TAB, payload: tab }),
      
    setFilters: (filters: Partial<AIAlertsState['filters']>) =>
      dispatch({ type: ActionType.SET_FILTERS, payload: filters }),
      
    updateFilter: (key: keyof AIAlertsState['filters'], value: string) =>
      dispatch({ type: ActionType.UPDATE_FILTER, payload: { key, value } }),
      
    resetFilters: () =>
      dispatch({ type: ActionType.RESET_FILTERS }),
      
    setSelectedFilters: (filters: string[]) =>
      dispatch({ type: ActionType.SET_SELECTED_FILTERS, payload: filters }),
      
    toggleFilter: (filter: string) =>
      dispatch({ type: ActionType.TOGGLE_FILTER, payload: filter }),
      
    setViewOptions: (options: Partial<AIAlertsState['viewOptions']>) =>
      dispatch({ type: ActionType.SET_VIEW_OPTIONS, payload: options }),
      
    updateViewOption: (key: keyof AIAlertsState['viewOptions'], value: boolean) =>
      dispatch({ type: ActionType.UPDATE_VIEW_OPTION, payload: { key, value } }),
      
    openModal: (type: 'action' | 'details', data: any) =>
      dispatch({ type: ActionType.SET_MODAL, payload: { type, data } }),
      
    closeModal: () =>
      dispatch({ type: ActionType.CLOSE_MODAL }),
      
    setLoading: (key: keyof AIAlertsState['loading'], value: boolean) =>
      dispatch({ type: ActionType.SET_LOADING, payload: { key, value } }),
      
    setError: (error: string | null) =>
      dispatch({ type: ActionType.SET_ERROR, payload: error }),
      
    setAlerts: (alerts: AIAlert[]) =>
      dispatch({ type: ActionType.SET_DATA, payload: { alerts } }),
      
    setSelectedAlert: (alert: AIAlert | null) =>
      dispatch({ type: ActionType.SET_DATA, payload: { selectedAlert: alert } }),
      
    startRefresh: () =>
      dispatch({ type: ActionType.SET_REFRESH_STATE, payload: { isRefreshing: true } }),
      
    completeRefresh: () =>
      dispatch({ 
        type: ActionType.SET_REFRESH_STATE, 
        payload: { isRefreshing: false, lastUpdated: new Date() } 
      }),
      
    batchUpdate: (updates: Partial<AIAlertsState>) =>
      dispatch({ type: ActionType.BATCH_UPDATE, payload: updates })
  }), []);

  // Computed values
  const computed = useMemo(() => ({
    isAnyFilterActive: state.filters.search !== '' || 
                       state.filters.type !== 'all' || 
                       state.filters.severity !== 'all' || 
                       state.filters.vehicle !== 'all' ||
                       state.filters.status !== 'pending',
                       
    activeFilterCount: [
      state.filters.search !== '' ? 1 : 0,
      state.filters.type !== 'all' ? 1 : 0,
      state.filters.severity !== 'all' ? 1 : 0,
      state.filters.vehicle !== 'all' ? 1 : 0,
      state.filters.status !== 'pending' ? 1 : 0
    ].reduce((a, b) => a + b, 0),
    
    isLoading: state.loading.main || state.loading.refresh || state.loading.scan,
    
    hasSelectedFilters: state.selectedFilters.length > 0 && !state.selectedFilters.includes('all')
  }), [state]);

  return {
    state,
    actions,
    computed,
    dispatch
  };
}

// Export types for external use
export type { AIAlertsState, Action };
export { ActionType };
