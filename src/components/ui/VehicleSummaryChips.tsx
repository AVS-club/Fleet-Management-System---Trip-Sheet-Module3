@@ .. @@
 import React from 'react';
 import { Truck, Calendar, FileText, Fuel, MapPin } from 'lucide-react';
 import { Vehicle } from '../../types';
+import { cn } from '../../utils/cn';
 
 interface VehicleSummaryChipsProps {
   vehicle: Vehicle;
 }
@@ .. @@
 
 const VehicleSummaryChips: React.FC<VehicleSummaryChipsProps> = ({ 
   vehicle,
   className = ''
 }) => {
   return (
   )
 }
-    <div className={`flex flex-wrap gap-2 ${className}`}>
+    <div className={cn("flex flex-wrap gap-2", className)}>
       {/* Make & Model */}
       <div className="flex items-center bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-xs md:text-sm">
         <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />