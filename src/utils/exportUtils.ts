import jsPDF from 'jspdf';
import 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Vehicle, Driver } from '../types';
import { supabase } from './supabaseClient';

// Helper function to add a section title to the PDF
const addSectionTitle = (doc: jsPDF, title: string, y: number): number => {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(title, 14, y);
  doc.setLineWidth(0.5);
  doc.setDrawColor(44, 62, 80);
  doc.line(14, y + 1, 196, y + 1);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  return y + 10;
};

// Helper function to add a field to the PDF
const addField = (doc: jsPDF, label: string, value: string, y: number): number => {
  doc.setFont('helvetica', 'bold');
  doc.text(label + ':', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(value || 'N/A', 60, y);
  return y + 7;
};

// Helper function to add a status badge to the PDF
const addStatusBadge = (doc: jsPDF, label: string, status: string, y: number): number => {
  doc.setFont('helvetica', 'bold');
  doc.text(label + ':', 14, y);
  
  // Set color based on status
  let color = [0, 0, 0]; // Default black
  if (status.toLowerCase().includes('active') || status.toLowerCase().includes('valid')) {
    color = [39, 174, 96]; // Green
  } else if (status.toLowerCase().includes('expired') || status.toLowerCase().includes('inactive')) {
    color = [231, 76, 60]; // Red
  } else if (status.toLowerCase().includes('pending') || status.toLowerCase().includes('maintenance')) {
    color = [243, 156, 18]; // Orange
  }
  
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(60, y - 4, 30, 5, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(status.toUpperCase(), 75, y, { align: 'center' });
  
  // Reset text properties
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  return y + 7;
};

// Function to generate a vehicle PDF
export const generateVehiclePDF = async (vehicle: Vehicle, stats: any): Promise<jsPDF> => {
  const doc = new jsPDF();
  
  // Add header with logo
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text('Vehicle Profile', 105, 20, { align: 'center' });
  
  // Add vehicle registration as subtitle
  doc.setFontSize(16);
  doc.text(vehicle.registration_number, 105, 30, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${vehicle.make} ${vehicle.model} (${vehicle.year})`, 105, 38, { align: 'center' });
  
  // Add generation date
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, 45, { align: 'center' });
  
  // Reset text properties
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  // Add vehicle details section
  let y = 55;
  y = addSectionTitle(doc, 'Vehicle Details', y);
  y = addField(doc, 'Registration Number', vehicle.registration_number, y);
  y = addField(doc, 'Chassis Number', vehicle.chassis_number || 'N/A', y);
  y = addField(doc, 'Engine Number', vehicle.engine_number || 'N/A', y);
  y = addField(doc, 'Make & Model', `${vehicle.make} ${vehicle.model}`, y);
  y = addField(doc, 'Year', vehicle.year.toString(), y);
  y = addField(doc, 'Type', vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1), y);
  y = addField(doc, 'Fuel Type', vehicle.fuel_type.charAt(0).toUpperCase() + vehicle.fuel_type.slice(1), y);
  y = addField(doc, 'Current Odometer', `${vehicle.current_odometer.toLocaleString()} km`, y);
  y = addStatusBadge(doc, 'Status', vehicle.status, y);
  
  // Add document status section
  y += 5;
  y = addSectionTitle(doc, 'Document Status', y);
  
  if (vehicle.insurance_end_date) {
    const insuranceStatus = new Date(vehicle.insurance_end_date) > new Date() ? 'Valid' : 'Expired';
    y = addStatusBadge(doc, 'Insurance', insuranceStatus, y);
    y = addField(doc, 'Insurance Expiry', new Date(vehicle.insurance_end_date).toLocaleDateString(), y);
  } else {
    y = addField(doc, 'Insurance', 'Not Available', y);
  }
  
  if (vehicle.fitness_expiry_date) {
    const fitnessStatus = new Date(vehicle.fitness_expiry_date) > new Date() ? 'Valid' : 'Expired';
    y = addStatusBadge(doc, 'Fitness Certificate', fitnessStatus, y);
    y = addField(doc, 'Fitness Expiry', new Date(vehicle.fitness_expiry_date).toLocaleDateString(), y);
  } else {
    y = addField(doc, 'Fitness Certificate', 'Not Available', y);
  }
  
  if (vehicle.permit_expiry_date) {
    const permitStatus = new Date(vehicle.permit_expiry_date) > new Date() ? 'Valid' : 'Expired';
    y = addStatusBadge(doc, 'Permit', permitStatus, y);
    y = addField(doc, 'Permit Expiry', new Date(vehicle.permit_expiry_date).toLocaleDateString(), y);
  } else {
    y = addField(doc, 'Permit', 'Not Available', y);
  }
  
  if (vehicle.puc_expiry_date) {
    const pucStatus = new Date(vehicle.puc_expiry_date) > new Date() ? 'Valid' : 'Expired';
    y = addStatusBadge(doc, 'PUC Certificate', pucStatus, y);
    y = addField(doc, 'PUC Expiry', new Date(vehicle.puc_expiry_date).toLocaleDateString(), y);
  } else {
    y = addField(doc, 'PUC Certificate', 'Not Available', y);
  }
  
  // Add performance stats section
  y += 5;
  y = addSectionTitle(doc, 'Performance Stats', y);
  y = addField(doc, 'Total Trips', stats?.totalTrips?.toString() || '0', y);
  y = addField(doc, 'Total Distance', `${stats?.totalDistance?.toLocaleString() || '0'} km`, y);
  y = addField(doc, 'Average Mileage', stats?.averageKmpl ? `${stats.averageKmpl.toFixed(2)} km/L` : 'N/A', y);
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Auto Vital Solution - Vehicle Profile - Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
  }
  
  return doc;
};

// Function to generate a driver PDF
export const generateDriverPDF = async (driver: Driver, trips: any[], primaryVehicle?: any): Promise<jsPDF> => {
  const doc = new jsPDF();
  
  // Add header with logo
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text('Driver Profile', 105, 20, { align: 'center' });
  
  // Add driver name as subtitle
  doc.setFontSize(16);
  doc.text(driver.name, 105, 30, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`License: ${driver.license_number}`, 105, 38, { align: 'center' });
  
  // Add generation date
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, 45, { align: 'center' });
  
  // Reset text properties
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  // Add driver details section
  let y = 55;
  y = addSectionTitle(doc, 'Driver Details', y);
  y = addField(doc, 'Name', driver.name, y);
  y = addField(doc, 'License Number', driver.license_number, y);
  y = addField(doc, 'Contact Number', driver.contact_number, y);
  y = addField(doc, 'Email', driver.email || 'N/A', y);
  y = addField(doc, 'Join Date', new Date(driver.join_date).toLocaleDateString(), y);
  y = addField(doc, 'Experience', `${driver.experience_years} years`, y);
  y = addStatusBadge(doc, 'Status', driver.status, y);
  
  // Add license status section
  y += 5;
  y = addSectionTitle(doc, 'License Status', y);
  
  if (driver.license_expiry_date) {
    const licenseStatus = new Date(driver.license_expiry_date) > new Date() ? 'Valid' : 'Expired';
    y = addStatusBadge(doc, 'License', licenseStatus, y);
    y = addField(doc, 'License Expiry', new Date(driver.license_expiry_date).toLocaleDateString(), y);
  } else {
    y = addField(doc, 'License Status', 'Not Available', y);
  }
  
  y = addField(doc, 'Documents Verified', driver.documents_verified ? 'Yes' : 'No', y);
  
  // Add primary vehicle section if available
  if (primaryVehicle) {
    y += 5;
    y = addSectionTitle(doc, 'Primary Vehicle', y);
    y = addField(doc, 'Registration', primaryVehicle.registration_number, y);
    y = addField(doc, 'Make & Model', `${primaryVehicle.make} ${primaryVehicle.model}`, y);
    y = addField(doc, 'Type', primaryVehicle.type.charAt(0).toUpperCase() + primaryVehicle.type.slice(1), y);
    y = addStatusBadge(doc, 'Vehicle Status', primaryVehicle.status, y);
  }
  
  // Add performance metrics section
  y += 5;
  y = addSectionTitle(doc, 'Performance Metrics', y);
  
  // Calculate metrics from trips
  const totalTrips = trips.length;
  const totalDistance = trips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
  const tripsWithMileage = trips.filter(trip => trip.calculated_kmpl && !trip.short_trip);
  const averageMileage = tripsWithMileage.length > 0
    ? tripsWithMileage.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / tripsWithMileage.length
    : 0;
  
  y = addField(doc, 'Total Trips', totalTrips.toString(), y);
  y = addField(doc, 'Total Distance', `${totalDistance.toLocaleString()} km`, y);
  y = addField(doc, 'Average Mileage', averageMileage > 0 ? `${averageMileage.toFixed(2)} km/L` : 'N/A', y);
  
  if (driver.performance_metrics?.risk_score !== undefined) {
    let riskLabel = 'Low Risk';
    if (driver.performance_metrics.risk_score > 70) riskLabel = 'High Risk';
    else if (driver.performance_metrics.risk_score > 30) riskLabel = 'Medium Risk';
    
    y = addField(doc, 'Risk Score', `${driver.performance_metrics.risk_score}% (${riskLabel})`, y);
  }
  
  // Add recent trips table if there are trips
  if (trips.length > 0) {
    y += 10;
    y = addSectionTitle(doc, 'Recent Trips', y);
    
    // Prepare table data
    const tableColumn = ['Date', 'Vehicle', 'Distance', 'Mileage'];
    const tableRows = trips.slice(0, 5).map(trip => [
      new Date(trip.trip_end_date).toLocaleDateString(),
      trip.vehicle_registration || 'Unknown',
      `${(trip.end_km - trip.start_km).toLocaleString()} km`,
      trip.calculated_kmpl ? `${trip.calculated_kmpl.toFixed(2)} km/L` : '-'
    ]);
    
    // Add table to document
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [76, 175, 80], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 240, 240] }
    });
    
    // Update y position after table
    y = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Auto Vital Solution - Driver Profile - Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
  }
  
  return doc;
};

// Function to download vehicle documents as a zip file
export const downloadVehicleDocuments = async (vehicle: Vehicle): Promise<void> => {
  try {
    const zip = new JSZip();
    const folder = zip.folder(`${vehicle.registration_number}_documents`);
    
    if (!folder) {
      throw new Error('Failed to create zip folder');
    }
    
    // Array to track download promises
    const downloadPromises: Promise<void>[] = [];
    
    // Helper function to add a document to the zip
    const addDocumentToZip = async (url: string | undefined, fileName: string) => {
      if (!url) return;
      
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${fileName}`);
        
        const blob = await response.blob();
        folder.file(fileName, blob);
      } catch (error) {
        console.error(`Error downloading ${fileName}:`, error);
      }
    };
    
    // Add RC document
    if (vehicle.rc_document_url) {
      downloadPromises.push(
        addDocumentToZip(vehicle.rc_document_url, `RC_${vehicle.registration_number}.pdf`)
      );
    }
    
    // Add insurance document
    if (vehicle.insurance_document_url) {
      downloadPromises.push(
        addDocumentToZip(vehicle.insurance_document_url, `Insurance_${vehicle.registration_number}.pdf`)
      );
    }
    
    // Add fitness document
    if (vehicle.fitness_document_url) {
      downloadPromises.push(
        addDocumentToZip(vehicle.fitness_document_url, `Fitness_${vehicle.registration_number}.pdf`)
      );
    }
    
    // Add permit document
    if (vehicle.permit_document_url) {
      downloadPromises.push(
        addDocumentToZip(vehicle.permit_document_url, `Permit_${vehicle.registration_number}.pdf`)
      );
    }
    
    // Add PUC document
    if (vehicle.puc_document_url) {
      downloadPromises.push(
        addDocumentToZip(vehicle.puc_document_url, `PUC_${vehicle.registration_number}.pdf`)
      );
    }
    
    // Add other documents
    if (vehicle.other_documents && Array.isArray(vehicle.other_documents)) {
      vehicle.other_documents.forEach((doc, index) => {
        if (doc.file) {
          downloadPromises.push(
            addDocumentToZip(doc.file as unknown as string, `Other_${index + 1}_${doc.name}.pdf`)
          );
        }
      });
    }
    
    // Wait for all downloads to complete
    await Promise.all(downloadPromises);
    
    // Generate and download the zip file
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${vehicle.registration_number}_documents.zip`);
    
  } catch (error) {
    console.error('Error creating zip file:', error);
    throw error;
  }
};

// Helper function to upload vehicle profile data to storage
const uploadVehicleProfile = async (vehicleId: string, vehicleData: any): Promise<void> => {
  const profileData = {
    id: vehicleData.id,
    registration_number: vehicleData.registration_number,
    make: vehicleData.make,
    model: vehicleData.model,
    year: vehicleData.year,
    type: vehicleData.type,
    fuel_type: vehicleData.fuel_type,
    current_odometer: vehicleData.current_odometer,
    status: vehicleData.status,
    chassis_number: vehicleData.chassis_number,
    engine_number: vehicleData.engine_number,
    owner_name: vehicleData.owner_name,
    insurance_end_date: vehicleData.insurance_end_date,
    fitness_expiry_date: vehicleData.fitness_expiry_date,
    permit_expiry_date: vehicleData.permit_expiry_date,
    puc_expiry_date: vehicleData.puc_expiry_date,
    created_at: vehicleData.created_at,
    updated_at: vehicleData.updated_at,
    generated_at: new Date().toISOString()
  };

  const { error } = await supabase.storage
    .from('vehicle-profiles')
    .upload(`${vehicleId}.json`, JSON.stringify(profileData, null, 2), {
      contentType: 'application/json',
      upsert: true
    });

  if (error) {
    console.error('Error uploading vehicle profile:', error);
    throw error;
  }
};

// Helper function to get vehicle data from database
const getVehicleData = async (vehicleId: string): Promise<any> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .single();

  if (error) {
    console.error('Error fetching vehicle data:', error);
    throw error;
  }
  
  return data;
};

// Function to create a shareable link for a vehicle profile
export const createShareableVehicleLink = async (vehicleId: string): Promise<string> => {
  try {
    // First, try to create a signed URL
    const { data, error } = await supabase.storage
      .from('vehicle-profiles')
      .createSignedUrl(`${vehicleId}.json`, 60 * 60 * 24 * 7); // 7 days in seconds
    
    if (error) {
      // If the error is "Object not found", create the profile first
      if (error.message.includes('Object not found') || error.message.includes('not_found')) {
        console.log('Vehicle profile not found in storage, creating it...');
        
        // Get vehicle data from database
        const vehicleData = await getVehicleData(vehicleId);
        
        // Upload the vehicle profile to storage
        await uploadVehicleProfile(vehicleId, vehicleData);
        
        // Retry creating the signed URL
        const { data: retryData, error: retryError } = await supabase.storage
          .from('vehicle-profiles')
          .createSignedUrl(`${vehicleId}.json`, 60 * 60 * 24 * 7);
        
        if (retryError) throw retryError;
        return retryData.signedUrl;
      }
      
      // If it's a different error, throw it
      throw error;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error creating shareable link:', error);
    throw error;
  }
};

// Helper function to upload driver profile data to storage
const uploadDriverProfile = async (driverId: string, driverData: any): Promise<void> => {
  const profileData = {
    id: driverData.id,
    name: driverData.name,
    license_number: driverData.license_number,
    contact_number: driverData.contact_number,
    email: driverData.email,
    join_date: driverData.join_date,
    status: driverData.status,
    experience_years: driverData.experience_years,
    primary_vehicle_id: driverData.primary_vehicle_id,
    license_expiry_date: driverData.license_expiry_date,
    documents_verified: driverData.documents_verified,
    driver_status_reason: driverData.driver_status_reason,
    created_at: driverData.created_at,
    updated_at: driverData.updated_at,
    generated_at: new Date().toISOString()
  };

  const { error } = await supabase.storage
    .from('driver-profiles')
    .upload(`${driverId}.json`, JSON.stringify(profileData, null, 2), {
      contentType: 'application/json',
      upsert: true
    });

  if (error) {
    console.error('Error uploading driver profile:', error);
    throw error;
  }
};

// Helper function to get driver data from database
const getDriverData = async (driverId: string): Promise<any> => {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .single();

  if (error) {
    console.error('Error fetching driver data:', error);
    throw error;
  }
  
  return data;
};

// Function to create a shareable link for a driver profile
export const createShareableDriverLink = async (driverId: string): Promise<string> => {
  try {
    // First, try to create a signed URL
    const { data, error } = await supabase.storage
      .from('driver-profiles')
      .createSignedUrl(`${driverId}.json`, 60 * 60 * 24 * 7); // 7 days in seconds
    
    if (error) {
      // If the error is "Object not found", create the profile first
      if (error.message.includes('Object not found') || error.message.includes('not_found')) {
        console.log('Driver profile not found in storage, creating it...');
        
        // Get driver data from database
        const driverData = await getDriverData(driverId);
        
        // Upload the driver profile to storage
        await uploadDriverProfile(driverId, driverData);
        
        // Retry creating the signed URL
        const { data: retryData, error: retryError } = await supabase.storage
          .from('driver-profiles')
          .createSignedUrl(`${driverId}.json`, 60 * 60 * 24 * 7);
        
        if (retryError) throw retryError;
        return retryData.signedUrl;
      }
      
      // If it's a different error, throw it
      throw error;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error creating shareable link:', error);
    throw error;
  }
};