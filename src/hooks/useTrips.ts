import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTrips, getTrip, createTrip, updateTrip, deleteTrip } from '../utils/api/trips';
import { Trip } from '../types';

// Query hooks
export const useTrips = () => {
  return useQuery({
    queryKey: ['trips'],
    queryFn: getTrips,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

export const useTrip = (id: string) => {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => getTrip(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
};

// Mutation hooks
export const useCreateTrip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: (error) => {
      console.error('Failed to create trip:', error);
    },
  });
};

export const useUpdateTrip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Trip> }) => 
      updateTrip(id, data),
    onSuccess: (updatedTrip) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.setQueryData(['trip', updatedTrip.id], updatedTrip);
    },
    onError: (error) => {
      console.error('Failed to update trip:', error);
    },
  });
};

export const useDeleteTrip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: (error) => {
      console.error('Failed to delete trip:', error);
    },
  });
};
