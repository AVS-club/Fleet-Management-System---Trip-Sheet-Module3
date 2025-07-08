import React from "react";
import { Controller, useFormContext } from "react-hook-form";

import {
  BATTERY_BRANDS,
  TYRE_BRANDS,
  MaintenanceTask,
} from "../../types/maintenance";
import Input from "../ui/Input";
import FileUpload from "../ui/FileUpload";
import Switch from "../ui/Switch";
import VendorSelector from "./VendorSelector";
import MaintenanceSelector from "./MaintenanceSelector";
import SearchableSelect from "../ui/SearchableSelect";
import { Trash2, IndianRupee, Battery, Disc, Paperclip } from "lucide-react";
import { addYears, format } from "date-fns";

interface ServiceGroupItemProps {
  index: number;
  remove: (index: number) => void;
  canRemove: boolean;
  errors: any;
}

const ServiceGroupItem: React.FC<ServiceGroupItemProps> = ({
  index,
  remove,
  canRemove,
  errors,
}) => {
  const { control, register, watch } =
    useFormContext<Partial<MaintenanceTask>>();
  const batteryTracking = watch(`service_groups.${index}.battery_tracking`);
  const tyreTracking = watch(`service_groups.${index}.tyre_tracking`);

  return (
    <div className="border rounded-lg relative overflow-hidden">
      <div className="bg-gray-50 p-3 pr-10 border-b flex items-center justify-between">
        <h4 className="font-medium text-gray-800">Service Group {index + 1}</h4>
        {canRemove && (
          <button
            type="button"
            className="absolute right-3 top-3 text-gray-400 hover:text-error-500 transition-colors"
            onClick={() => remove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Controller
            control={control}
            name={`service_groups.${index}.vendor_id` as const}
            rules={{ required: "Vendor is required" }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <VendorSelector
                selectedVendor={value}
                onChange={onChange}
                error={error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name={`service_groups.${index}.tasks` as const}
            rules={{ required: "At least one task must be selected" }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <MaintenanceSelector
                selectedItems={value || []}
                onChange={onChange}
                showGroupView={true}
                error={error?.message}
              />
            )}
          />

          <Input
            label="Cost (₹)"
            type="number"
            className="ps-8"
            icon={<IndianRupee className="h-4 w-4" />}
            error={errors.service_groups?.[index]?.cost?.message}
            required
            {...register(`service_groups.${index}.cost` as const, {
              required: "Cost is required",
              valueAsNumber: true,
              min: { value: 0, message: "Cost must be positive" },
            })}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
              <div className="flex items-center">
                <Battery className="h-5 w-5 text-blue-500 mr-2" />
                <h5 className="font-medium text-gray-700">
                  Battery Replacement
                </h5>
              </div>
              <Controller
                control={control}
                name={`service_groups.${index}.battery_tracking` as const}
                defaultValue={false}
                render={({ field: { value, onChange } }) => (
                  <Switch
                    checked={value}
                    onChange={(e) => onChange(e.target.checked)}
                    size="sm"
                  />
                )}
              />
            </div>
            {batteryTracking && (
              <div className="grid grid-cols-1 gap-3 pl-2 sm:pl-3 border-l-2 border-blue-200">
                <div className="flex items-center gap-2">
                  <div className="flex-grow">
                    <Input
                      label="Battery Serial Number"
                      placeholder="Enter serial number"
                      size="sm"
                      {...register(
                        `service_groups.${index}.battery_serial` as const
                      )}
                    />
                  </div>
                  <div className="mt-6">
                    <Controller
                      control={control}
                      name={
                        `service_groups.${index}.battery_warranty_file` as const
                      }
                      render={({ field: { value, onChange } }) => (
                        <FileUpload
                          iconOnly
                          value={value as File | null}
                          onChange={onChange}
                          accept=".jpg,.jpeg,.png,.pdf"
                          icon={<Paperclip className="h-4 w-4" />}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={control}
                    name={`service_groups.${index}.battery_brand` as const}
                    render={({ field }) => (
                      <SearchableSelect
                        label="Battery Brand"
                        options={BATTERY_BRANDS}
                        value={field.value || ""}
                        onChange={(value) => field.onChange(value)}
                        placeholder="Select or search brand"
                        size="sm"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name={
                      `service_groups.${index}.battery_warranty_expiry_date` as const
                    }
                    defaultValue={format(addYears(new Date(), 1), "yyyy-MM-dd")}
                    render={({ field }) => (
                      <Input
                        type="date"
                        placeholder="Warranty Expiry"
                        size="sm"
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Disc className="h-5 w-5 text-gray-600 mr-2" />
                <h5 className="font-medium text-gray-700 break-words">
                  Tyre Replacement
                </h5>
              </div>
              <Controller
                control={control}
                name={`service_groups.${index}.tyre_tracking` as const}
                defaultValue={false}
                render={({ field: { value, onChange } }) => (
                  <Switch
                    checked={value}
                    onChange={(e) => onChange(e.target.checked)}
                    size="sm"
                  />
                )}
              />
            </div>
            {tyreTracking && (
              <div className="grid grid-cols-1 gap-3 pl-2 sm:pl-3 border-l-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-grow">
                    <Controller
                      control={control}
                      name={`service_groups.${index}.tyre_positions` as const}
                      defaultValue={[]}
                      render={({ field: { value, onChange } }) => (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Tyre Positions
                            </label>
                            <Controller
                              control={control}
                              name={
                                `service_groups.${index}.tyre_warranty_file` as const
                              }
                              render={({ field: { value, onChange } }) => (
                                <FileUpload
                                  iconOnly
                                  value={value as File | null}
                                  onChange={onChange}
                                  accept=".jpg,.jpeg,.png,.pdf"
                                  icon={<Paperclip className="h-4 w-4" />}
                                />
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded border border-gray-200">
                            {["FL", "FR", "RL", "RR", "Stepney"].map(
                              (position) => (
                                <label
                                  key={position}
                                  className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={value?.includes(position)}
                                    onChange={(e) => {
                                      const newPositions = e.target.checked
                                        ? [...(value || []), position]
                                        : (value || []).filter(
                                            (p) => p !== position
                                          );
                                      onChange(newPositions);
                                    }}
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded min-w-[16px]"
                                  />
                                  <span className="text-xs sm:text-sm text-gray-600">
                                    {position}
                                  </span>
                                </label>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={control}
                    name={`service_groups.${index}.tyre_brand` as const}
                    render={({ field }) => (
                      <SearchableSelect
                        label="Tyre Brand"
                        options={TYRE_BRANDS}
                        value={field.value || ""}
                        onChange={(value) => field.onChange(value)}
                        placeholder="Select or search brand"
                        size="sm"
                      />
                    )}
                  />
                  <div className="grid grid-cols-1 gap-2">
                    <Input
                      label="Tyre Serial Numbers"
                      placeholder="Comma separated"
                      size="sm"
                      {...register(
                        `service_groups.${index}.tyre_serials` as const
                      )}
                    />
                    <Controller
                      control={control}
                      name={
                        `service_groups.${index}.tyre_warranty_expiry_date` as const
                      }
                      defaultValue={format(
                        addYears(new Date(), 1),
                        "yyyy-MM-dd"
                      )}
                      render={({ field }) => (
                        <Input
                          type="date"
                          placeholder="Warranty Expiry"
                          size="sm"
                          {...field}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3">
          <Controller
            control={control}
            name={`service_groups.${index}.bill_file` as const}
            render={({ field: { value, onChange } }) => (
              <FileUpload
                buttonMode={true}
                label="Upload Bill"
                accept=".jpg,.jpeg,.png,.pdf"
                value={value as File | null}
                onChange={onChange}
                icon={<Paperclip className="h-4 w-4" />}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default ServiceGroupItem;
