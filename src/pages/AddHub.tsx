import React from "react";
import VehicleForm from "../components/vehicles/VehicleForm";
import TripForm from "../components/trips/TripForm";
import MaintenanceTaskForm from "../components/maintenance/MaintenanceTaskForm";
import DocumentForm from "../components/documents/DocumentForm";

export default function AddHub() {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Add Data</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <section className="rounded-xl border p-4 bg-card">
          <h2 className="font-medium mb-3">Add Vehicle</h2>
          <VehicleForm />
        </section>
        <section className="rounded-xl border p-4 bg-card">
          <h2 className="font-medium mb-3">Add Trip</h2>
          <TripForm />
        </section>
        <section className="rounded-xl border p-4 bg-card">
          <h2 className="font-medium mb-3">Add Maintenance</h2>
          <MaintenanceTaskForm />
        </section>
        <section className="rounded-xl border p-4 bg-card">
          <h2 className="font-medium mb-3">Add Document</h2>
          <DocumentForm />
        </section>
      </div>
    </div>
  );
}