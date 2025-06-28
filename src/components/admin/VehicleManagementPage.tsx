@@ .. @@
       actions={
         <Button
           variant="outline"
           onClick={() => navigate('/admin')}
           icon={<ChevronLeft className="h-4 w-4" />}
         >
           Back to Admin
         </Button>
       }
     >
       <div className="space-y-6">
         {/* Stats Cards */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <StatCard
             title="Total Vehicles"
             value={totalVehicles}
             icon={<Truck className="h-5 w-5 text-primary-600" />}
           />
 
           <StatCard
             title="Vehicles with 0 Trips"
             value={vehiclesZeroTrips}
             icon={<Calendar className="h-5 w-5 text-warning-600" />}
             warning={vehiclesZeroTrips > 0}
           />
 
           <StatCard
             title="Average Odometer"
             value={avgOdometer.toLocaleString()}
             subtitle="km"
             icon={<TrendingUp className="h-5 w-5 text-primary-600" />}
           />
 
           <StatCard
             title="Documents Pending"
             value={docsPendingVehicles}
             icon={<FileCheck className="h-5 w-5 text-error-600" />}
             warning={docsPendingVehicles > 0}
           />
         </div>
 
         {showArchived && (
           <div className="bg-gray-100 border-l-4 border-warning-500 p-4 mb-6">
             <div className="flex">
               <AlertTriangle className="h-6 w-6 text-warning-500 mr-2" />
               <div>
                 <h3 className="text-warning-800 font-medium">
                   Viewing Archived Vehicles
                 </h3>
                 <p className="text-warning-700">
                   You are currently viewing archived vehicles. These vehicles
                   are hidden from other parts of the system.
                 </p>
               </div>
             </div>
           </div>
         )}
 
         {/* Filters */}
         <div className="bg-white p-4 rounded-lg shadow-sm">
-          <div className="flex flex-wrap gap-4 justify-between">
-            <div className="flex flex-wrap flex-1 gap-4">
+          <div className="flex flex-col md:flex-row flex-wrap gap-4 justify-between">
+            <div className="flex flex-col sm:flex-row flex-wrap flex-1 gap-4">
               <div className="w-full sm:w-auto flex-1 min-w-[200px]">
                 <Input
                   placeholder="Search vehicles..."
                   icon={<Search className="h-4 w-4" />}
                   value={filters.search}
                   onChange={e => setFilters({ ...filters, search: e.target.value })}
                 />
               </div>
               
               <div className="w-40">
                 <Select
                   options={[
                     { value: 'all', label: 'All Status' },
                     { value: 'active', label: 'Active' },
                     { value: 'maintenance', label: 'Maintenance' },
                     { value: 'inactive', label: 'Inactive' },
                     { value: 'stood', label: 'Stood' },
                     { value: 'archived', label: 'Archived' }
                   ]}
                   value={filters.status}
                   onChange={e => setFilters({ ...filters, status: e.target.value })}
                 />
               </div>
               
               <div className="w-40">
                 <Select
                   options={[
                     { value: 'all', label: 'All Types' },
                     { value: 'truck', label: 'Truck' },
                     { value: 'tempo', label: 'Tempo' },
                     { value: 'trailer', label: 'Trailer' },
                     { value: 'pickup', label: 'Pickup' },
                     { value: 'van', label: 'Van' }
                   ]}
                   value={filters.type}
                   onChange={e => setFilters({ ...filters, type: e.target.value })}
                 />
               </div>
             </div>
             
-            <div className="flex gap-2">
+            <div className="flex flex-wrap gap-2">
               <Button
                 variant="outline"
                 onClick={handleExportData}
                 icon={<Download className="h-4 w-4" />}
                 isLoading={exportLoading}
               >
                 Export
               </Button>
               
               {selectedVehicles.size > 0 && (
                 <>
                   {filters.status === 'archived' ? (
                     <Button
                       variant="primary"
                       onClick={() => setbulkUnarchiveModal({ isOpen: true, count: selectedVehicles.size })}
                       icon={<ArchiveRestore className="h-4 w-4" />}
                     >
                       Unarchive Selected
                     </Button>
                   ) : (
                     <Button
                       variant="warning"
                       onClick={() => setbulkArchiveModal({ isOpen: true, count: selectedVehicles.size })}
                       icon={<Archive className="h-4 w-4" />}
                     >
                       Archive Selected
                     </Button>
                   )}
                 </>
               )}
             </div>
           </div>