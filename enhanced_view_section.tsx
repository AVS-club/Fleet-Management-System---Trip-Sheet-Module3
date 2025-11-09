// This is the enhanced view section for MaintenanceTaskPage.tsx
// Replace lines 643-717 with this content

{isViewMode ? (
  task ? (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/maintenance/${id}`, {
                state: { task, mode: "edit" },
              })
            }
            icon={<Edit className="h-4 w-4" />}
          >
            Edit Task
          </Button>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Vehicle</h3>
            <p className="text-gray-900">
              {vehicles.find((v) => v.id === task.vehicle_id)?.registration_number || 'Unknown'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              task.status === 'completed' ? 'bg-success-100 text-success-700' :
              task.status === 'in_progress' ? 'bg-warning-100 text-warning-700' :
              task.status === 'pending' ? 'bg-gray-100 text-gray-700' :
              'bg-danger-100 text-danger-700'
            }`}>
              {task.status?.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Priority</h3>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              task.priority === 'high' ? 'bg-danger-100 text-danger-700' :
              task.priority === 'medium' ? 'bg-warning-100 text-warning-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {task.priority?.toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Task Type</h3>
            <p className="text-gray-900 capitalize">{task.task_type?.replace(/_/g, ' ') || 'Not specified'}</p>
          </div>

          {/* Service Details Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Start Date</h3>
            <p className="text-gray-900">{task.start_date ? new Date(task.start_date).toLocaleDateString() : 'Not specified'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">End Date</h3>
            <p className="text-gray-900">{task.end_date ? new Date(task.end_date).toLocaleDateString() : 'Not specified'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Downtime</h3>
            <p className="text-gray-900">
              {task.downtime_days ? `${task.downtime_days} days` : ''}
              {task.downtime_hours ? ` ${task.downtime_hours} hours` : ''}
              {!task.downtime_days && !task.downtime_hours ? 'Not specified' : ''}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Odometer Reading</h3>
            <p className="text-gray-900">{task.odometer_reading ? `${task.odometer_reading} km` : 'Not specified'}</p>
          </div>
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
            <p className="text-gray-900">{task.description || 'No description provided'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Estimated Cost</h3>
            <p className="text-gray-900">₹{task.estimated_cost?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Actual Cost</h3>
            <p className="text-gray-900">₹{task.actual_cost?.toLocaleString() || '0'}</p>
          </div>
        </div>
      </div>

      {/* Service Groups Section */}
      {task.service_groups && task.service_groups.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-green-600" />
            Shops/Mechanics & Services
          </h2>
          <div className="space-y-4">
            {task.service_groups.map((group: any, index: number) => (
              <div key={index} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                {/* Vendor Chip */}
                <div className="mb-3">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    <span className="bg-green-200 text-green-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2">
                      {index + 1}
                    </span>
                    {group.vendor_id || 'Unknown Vendor'}
                  </span>
                  <span className="ml-2 text-sm text-gray-600">
                    ₹{(group.cost || 0).toLocaleString()}
                  </span>
                </div>

                {/* Service Type */}
                {group.service_type && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-500">Service Type: </span>
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      group.service_type === 'purchase' ? 'bg-indigo-100 text-indigo-700' :
                      group.service_type === 'labor' ? 'bg-purple-100 text-purple-700' :
                      'bg-teal-100 text-teal-700'
                    }`}>
                      {group.service_type === 'purchase' ? 'Bought Parts Only' :
                       group.service_type === 'labor' ? 'Got Service/Repair Done' :
                       'Bought Parts + Got Them Installed'}
                    </span>
                  </div>
                )}

                {/* Tasks */}
                {group.tasks && group.tasks.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Work Done:</p>
                    <div className="flex flex-wrap gap-1">
                      {group.tasks.map((taskId: string, idx: number) => (
                        <span key={idx} className="inline-flex px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          Task {idx + 1}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parts Data */}
                {group.parts_data && group.parts_data.length > 0 && (
                  <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">Parts:</p>
                    <div className="space-y-2">
                      {group.parts_data.map((part: any, idx: number) => (
                        <div key={idx} className="text-xs text-gray-600">
                          <span className="font-medium">{part.partName || part.partType}</span>
                          {part.brand && ` - ${part.brand}`}
                          {part.quantity && ` (Qty: ${part.quantity})`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {group.notes && (
                  <div className="mt-2 text-xs text-gray-600">
                    <span className="font-medium">Notes: </span>{group.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complaint & Resolution */}
      {(task.complaint_description || task.resolution_description) && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Complaint & Resolution</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {task.complaint_description && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Complaint</h3>
                <p className="text-gray-900">{task.complaint_description}</p>
              </div>
            )}
            {task.resolution_description && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Resolution</h3>
                <p className="text-gray-900">{task.resolution_description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
      Task details not available.
    </div>
  )
) : (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <MaintenanceTaskForm
      vehicles={vehicles}
      initialData={task || undefined}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  </div>
)}
