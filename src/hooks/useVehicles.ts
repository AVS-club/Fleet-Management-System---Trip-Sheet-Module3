import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle } from '../utils/api/vehicles';
import { Vehicle } from '../types';

// Query hooks
export const useVehicles = () => {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

export const useVehicle = (id: string) => {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => getVehicle(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
};

// Mutation hooks
export const useCreateVehicle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (error) => {
      console.error('Failed to create vehicle:', error);
    },
  });
};

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) => 
      updateVehicle(id, data),
    onSuccess: (updatedVehicle) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.setQueryData(['vehicle', updatedVehicle.id], updatedVehicle);
    },
    onError: (error) => {
      console.error('Failed to update vehicle:', error);
    },
  });
};

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (error) => {
      console.error('Failed to delete vehicle:', error);
    },
  });
};
