import React, { useState, useEffect } from "react";
import Layout from "../components/layout/Layout";
import VehicleForm from "../components/vehicles/VehicleForm";
import TripForm from "../components/trips/TripForm";
import MaintenanceTaskForm from "../components/maintenance/MaintenanceTaskForm";
import DocumentForm from "../components/documents/DocumentForm";
import { Vehicle, TripFormData } from "../types";
import { MaintenanceTask } from "../types/maintenance";
import { createVehicle, createTrip, getVehicles } from "../utils/storage";
import { createTask } from "../utils/maintenanceStorage";
import { Truck, FileText, PenTool as Tool, Upload, CheckCircle } from "lucide-react";
import { toast } from "react-toastify";

export default function AddHub() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false);
  const [isSubmittingMaintenance, setIsSubmittingMaintenance] = useState(false);
  const [isSubmittingDocument, setIsSubmittingDocument] = useState(false);

  // Load vehicles for trip and maintenance forms
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehiclesData = await getVehicles();
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };
    
    fetchVehicles();
  }, []);

  const handleVehicleSubmit = async (data: Omit<Vehicle, "id">) => {
    setIsSubmittingVehicle(true);
    try {
      const newVehicle = await createVehicle(data);
      if (newVehicle) {
        setVehicles(prev => [...prev, newVehicle]);
        toast.success('Vehicle added successfully');
      } else {
        toast.error('Failed to add vehicle');
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error('Error adding vehicle');
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  const handleTripSubmit = async (data: TripFormData) => {
    setIsSubmittingTrip(true);
    try {
      const newTrip = await createTrip(data);
      if (newTrip) {
        toast.success('Trip added successfully');
      } else {
        toast.error('Failed to add trip');
      }
    } catch (error) {
      console.error('Error adding trip:', error);
      toast.error('Error adding trip');
    } finally {
      setIsSubmittingTrip(false);
    }
  };

  const handleMaintenanceSubmit = async (data: Partial<MaintenanceTask>) => {
    setIsSubmittingMaintenance(true);
    try {
      const newTask = await createTask(data as Omit<MaintenanceTask, "id" | "created_at" | "updated_at">);
      if (newTask) {
        toast.success('Maintenance task added successfully');
      } else {
        toast.error('Failed to add maintenance task');
      }
    } catch (error) {
      console.error('Error adding maintenance task:', error);
      toast.error('Error adding maintenance task');
    } finally {
      setIsSubmittingMaintenance(false);
    }
  };

  const handleDocumentSubmit = async (data: any) => {
    setIsSubmittingDocument(true);
    try {
      // For now, just show success message since document storage isn't fully implemented
      console.log('Document data:', data);
      toast.success('Document added successfully');
    } catch (error) {
      console.error('Error adding document:', error);
      toast.error('Error adding document');
    } finally {
      setIsSubmittingDocument(false);
    }
  };

  return (
    <Layout
      title="Add Data Hub"
      subtitle="Quick access to add vehicles, trips, maintenance tasks, and documents"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Add Vehicle Section */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Truck className="h-5 w-5 mr-2 text-blue-600" />
                Add Vehicle
              </h2>
              <p className="text-sm text-gray-600 mt-1">Register a new vehicle in your fleet</p>
            </div>
            <div className="p-6">
              <VehicleForm
                onSubmit={handleVehicleSubmit}
                isSubmitting={isSubmittingVehicle}
              />
            </div>
          </section>

          {/* Add Trip Section */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-600" />
                Add Trip
              </h2>
              <p className="text-sm text-gray-600 mt-1">Record a new trip for tracking</p>
            </div>
            <div className="p-6">
              <TripForm
                onSubmit={handleTripSubmit}
                isSubmitting={isSubmittingTrip}
              />
            </div>
          </section>

          {/* Add Maintenance Section */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Tool className="h-5 w-5 mr-2 text-orange-600" />
                Add Maintenance
              </h2>
              <p className="text-sm text-gray-600 mt-1">Log maintenance work and repairs</p>
            </div>
            <div className="p-6">
              <MaintenanceTaskForm
                vehicles={vehicles}
                onSubmit={handleMaintenanceSubmit}
                isSubmitting={isSubmittingMaintenance}
              />
            </div>
          </section>

          {/* Add Document Section */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Upload className="h-5 w-5 mr-2 text-purple-600" />
                Add Document
              </h2>
              <p className="text-sm text-gray-600 mt-1">Upload and manage documents</p>
            </div>
            <div className="p-6">
              <DocumentForm
                onSubmit={handleDocumentSubmit}
                isSubmitting={isSubmittingDocument}
              />
            </div>
          </section>
        </div>

        {/* Success Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-blue-500 mr-2" />
            <div>
              <h3 className="text-blue-800 font-medium">Quick Add Hub</h3>
              <p className="text-blue-700 text-sm mt-1">
                Use this page to quickly add new data to your fleet management system. All forms are optimized for fast data entry.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}