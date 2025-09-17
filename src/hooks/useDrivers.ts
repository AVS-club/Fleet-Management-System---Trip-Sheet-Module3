import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDrivers, getDriver, createDriver, updateDriver, deleteDriver } from '../utils/api/drivers';
import { Driver } from '../types';

// Query hooks
export const useDrivers = () => {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

export const useDriver = (id: string) => {
  return useQuery({
    queryKey: ['driver', id],
    queryFn: () => getDriver(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
};

// Mutation hooks
export const useCreateDriver = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (error) => {
      console.error('Failed to create driver:', error);
    },
  });
};

export const useUpdateDriver = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Driver> }) => 
      updateDriver(id, data),
    onSuccess: (updatedDriver) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.setQueryData(['driver', updatedDriver.id], updatedDriver);
    },
    onError: (error) => {
      console.error('Failed to update driver:', error);
    },
  });
};

export const useDeleteDriver = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (error) => {
      console.error('Failed to delete driver:', error);
    },
  });
};
