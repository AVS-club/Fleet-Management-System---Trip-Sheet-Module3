import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import {
  Truck,
  Calendar,
  PenTool as PenToolIcon,
  AlertTriangle,
  ChevronLeft,
  Fuel,
  FileText,
  Shield,
  Clock,
  Info,
  BarChart2,
  Database,
  IndianRupee,
  User,
} from "lucide-react";
import { Vehicle } from "@/types";
import Button from "../components/ui/Button";
import MileageChart from "../components/dashboard/MileageChart";
import VehicleForm from "../components/vehicles/VehicleForm";
import VehicleSummaryChips from "../components/vehicles/VehicleSummaryChips";
import VehicleActions from "../components/vehicles/VehicleActions";
import useVehicleData from "../hooks/useVehicleData";
const VehiclePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const { vehicle, trips, stats, signedDocUrls, loading } = useVehicleData(id);
  if (!vehicle) {
    return (
      <Layout title="Vehicle Not Found">
        <div className="text-center py-12">
          <p className="text-gray-500">
            The requested vehicle could not be found.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/vehicles")}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Vehicles
          </Button>
        </div>
      </Layout>
    );
  }

  if (isEditing) {
    return (
      <Layout
        title="Edit Vehicle"
        subtitle={vehicle.registration_number}
        actions={
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        }
      >
        <div className="max-w-4xl mx-auto">
          <VehicleForm
            initialData={vehicle}
            onSubmit={(data) => {
              // Handle update
              setIsEditing(false);
            }}
          />
        </div>
      </Layout>
    );
  }

  // Helper functions for document status
  const getDocumentStatus = (docPath?: string[], expiryDate?: string) => {
    if (!docPath || !docPath.length)
      return {
        status: "missing",
        label: "Missing",
        color: "bg-gray-100 text-gray-800",
      };

    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      if (expiry < now) {
        return {
          status: "expired",
          label: "Expired",
          color: "bg-error-100 text-error-800",
        };
      }

      // Check if expiring soon (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      if (expiry < thirtyDaysFromNow) {
        return {
          status: "expiring",
          label: "Expiring Soon",
          color: "bg-warning-100 text-warning-800",
        };
      }
    }

    return {
      status: "valid",
      label: "Valid",
      color: "bg-success-100 text-success-800",
    };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  // Calculate document statuses
  const rcStatus = getDocumentStatus(
    vehicle.rc_document_url,
    vehicle.rc_expiry_date
  );
  const insuranceStatus = getDocumentStatus(
    vehicle.insurance_document_url,
    vehicle.insurance_expiry_date
  );
  const fitnessStatus = getDocumentStatus(
    vehicle.fitness_document_url,
    vehicle.fitness_expiry_date
  );
  const taxStatus = getDocumentStatus(
    vehicle.tax_document_url,
    vehicle.tax_period ? "future" : undefined
  ); // Tax doesn't always have an expiry
  const permitStatus = getDocumentStatus(
    vehicle.permit_document_url,
    vehicle.permit_expiry_date
  );
  const pucStatus = getDocumentStatus(
    vehicle.puc_document_url,
    vehicle.puc_expiry_date
  );


  return (
    <Layout
      title={`Vehicle: ${vehicle.registration_number}`}
      subtitle={`${vehicle.make} ${vehicle.model} (${vehicle.year})`}
      actions={
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/vehicles")}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back
          </Button>

          {vehicle && (
            <VehicleActions
              vehicle={vehicle}
              stats={stats}
              signedDocUrls={signedDocUrls}
            />
          )}

          <Button
            onClick={() => setIsEditing(true)}
            icon={<PenToolIcon className="h-4 w-4" />}
          >
            Edit Vehicle
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Content Grid - 3 Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* SECTION 1: VEHICLE INFORMATION */}
            <div className="bg-white p-6 rounded-lg shadow-sm space-y-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Vehicle Information
                  </h3>
                  {vehicle.owner_name && (
                    <p className="text-sm text-gray-500">
                      <span className="inline-flex items-center">
                        <User className="h-3.5 w-3.5 mr-1 text-gray-400" />
                        Owned by {vehicle.owner_name}
                      </span>
                    </p>
                  )}
                </div>
                <div
                  className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                    vehicle.status === "active"
                      ? "bg-success-100 text-success-800"
                      : vehicle.status === "maintenance"
                      ? "bg-warning-100 text-warning-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {vehicle.status}
                </div>
              </div>

              <div className="space-y-3 divide-y divide-gray-100">
                <div className="grid grid-cols-2 gap-4 pb-3">
                  <div>
                    <p className="text-xs text-gray-500">Registration</p>
                    <p className="font-medium">{vehicle.registration_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Make & Model</p>
                    <p className="font-medium">
                      {vehicle.make} {vehicle.model}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="font-medium capitalize">{vehicle.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Year</p>
                    <p className="font-medium">{vehicle.year}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500">Fuel Type</p>
                    <p className="font-medium capitalize">
                      {vehicle.fuel_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Chassis Number</p>
                    <p className="font-medium font-mono text-sm">
                      {vehicle.chassis_number || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500">Engine Number</p>
                    <p className="font-medium font-mono text-sm">
                      {vehicle.engine_number || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reg. Date</p>
                    <p className="font-medium">
                      {formatDate(vehicle.registration_date)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500">Current Odometer</p>
                    <p className="font-medium">
                      {vehicle.current_odometer?.toLocaleString()} km
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tyre Details</p>
                    <p className="font-medium">
                      {vehicle.tyre_size && vehicle.number_of_tyres
                        ? `${vehicle.number_of_tyres}x ${vehicle.tyre_size}`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: DOCUMENT STATUS */}
            <div className="bg-white p-6 rounded-lg shadow-sm space-y-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium text-gray-900">
                  Compliance Documents
                </h3>
                <Shield className="h-5 w-5 text-primary-500" />
              </div>

              <div className="space-y-4">
                {/* RC Document */}

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium">RC Document</span>
                      <span
                        className={`ml-2 px-2 py-0.5 rounded-full text-xs ${rcStatus.color}`}
                      >
                        {rcStatus.label}
                      </span>
                    </div>
                    {vehicle.rc_expiry_date && (
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        Expires: {formatDate(vehicle.rc_expiry_date)}
                      </p>
                    )}
                  </div>
                  {signedDocUrls.rc &&
                    Array.isArray(signedDocUrls.rc) &&
                    signedDocUrls.rc.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {signedDocUrls.rc.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 text-sm font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition-colors"
                          >
                            View
                          </a>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default VehiclePage;