import React from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { MaintenanceTask } from "../../types/maintenance";
import Button from "../ui/Button";
import { Plus } from "lucide-react";
import ServiceGroupItem from "./ServiceGroupItem";

const ServiceGroupsSection: React.FC = () => {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<Partial<MaintenanceTask>>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "service_groups",
  });
  const serviceGroupsWatch = watch("service_groups");

  const totalCost =
    serviceGroupsWatch?.reduce(
      (sum, group) => sum + (parseFloat((group as any).cost) || 0),
      0
    ) || 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
      <h3 className="text-lg font-medium text-gray-900 flex items-center">
        Service Groups
      </h3>
      <p className="text-sm text-gray-500">
        Add one or more service groups to this maintenance task
      </p>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <ServiceGroupItem
            key={field.id}
            index={index}
            remove={remove}
            canRemove={fields.length > 1}
            errors={errors}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              vendor_id: "",
              tasks: [],
              cost: 0,
              battery_tracking: false,
              tyre_tracking: false,
            })
          }
          icon={<Plus className="h-4 w-4" />}
        >
          + Add Service Group
        </Button>

        {fields.length > 0 && (
          <div className="p-4 bg-success-50 rounded-lg border border-success-200">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-success-700">Total Cost</h4>
              <p className="text-lg font-semibold text-success-700">
                ₹{totalCost.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceGroupsSection;
