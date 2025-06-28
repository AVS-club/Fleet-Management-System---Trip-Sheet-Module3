@@ .. @@
       {/* Filters */}
       {!loading && (
         <div className="bg-white p-4 rounded-lg shadow-sm mb-6 sticky top-16 z-10">
-          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
+          <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4 mb-4">
             <h3 className="text-lg font-medium">Trip Filters</h3>
-            <div className="flex gap-2">
+            <div className="flex flex-wrap gap-2">
               <Button 
                 variant="outline"
                 size="sm"
                 onClick={clearFilters}
                 icon={<X className="h-4 w-4" />}
               >
                 Clear Filters
               </Button>
               
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={refreshData}
                 icon={<RefreshCw className="h-4 w-4" />}
                 isLoading={refreshing}
               >
                 Refresh
               </Button>
               
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => setShowFilters(!showFilters)}
                 icon={showFilters ? <ChevronDown className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
               >
                 {showFilters ? 'Hide Filters' : 'Show Filters'}
               </Button>
             </div>
           </div>
 
           {showFilters && (
               )
               }
       )
       }
-            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
+            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
               {/* Search */}
               <Input
                 placeholder="Search trips..."
                 icon={<Search className="h-4 w-4" />}
                 value={filters.search}
                 onChange={e => handleFiltersChange({ search: e.target.value })}
               />
               
               {/* Date Preset Dropdown */}
               <Select
                 options={datePresetOptions}
                 value={datePreset}
                 onChange={e => setDatePreset(e.target.value)}
               />
               
               {/* Date Range */}
               <Input
                 type="date"
                 value={filters.dateRange.start}
                 onChange={e => handleFiltersChange({ dateRange: { ...filters.dateRange, start: e.target.value } })}
                 icon={<Calendar className="h-4 w-4" />}
               />
               
               <Input
                 type="date"
                 value={filters.dateRange.end}
                 onChange={e => handleFiltersChange({ dateRange: { ...filters.dateRange, end: e.target.value } })}
                 icon={<Calendar className="h-4 w-4" />}
               />
               
               {/* Vehicle Dropdown */}
               <Select
                 options={[
                   { value: '', label: 'All Vehicles' },
                   ...vehicles.map(v => ({
                     value: v.id,
                     label: v.registration_number
                   }))
                 ]}
                 value={filters.vehicleId}
                 onChange={e => handleFiltersChange({ vehicleId: e.target.value })}
               />
               
               {/* Driver Dropdown */}
               <Select
                 options={[
                   { value: '', label: 'All Drivers' },
                   ...drivers.map(d => ({
                     value: d.id,
                     label: d.name
                   }))
                 ]}
                 value={filters.driverId}
                 onChange={e => handleFiltersChange({ driverId: e.target.value })}
               />
               
               {/* Warehouse Dropdown */}
               <Select
                 options={[
                   { value: '', label: 'All Warehouses' },
                   ...warehouses.map(w => ({
                     value: w.id,
                     label: w.name
                   }))
                 ]}
                 value={filters.warehouseId}
                 onChange={e => handleFiltersChange({ warehouseId: e.target.value })}
               />
               
               {/* Trip Type Dropdown */}
               <Select
                 options={[
                   { value: '', label: 'All Trip Types' },
                   { value: 'one_way', label: 'One Way' },
                   { value: 'two_way', label: 'Two Way' },
                   { value: 'local', label: 'Local Trip' }
                 ]}
                 value={filters.tripType}
                 onChange={e => handleFiltersChange({ tripType: e.target.value })}
               />
             </div>
           )}