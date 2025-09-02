import React from "react";
import { useFormContext } from "react-hook-form";
import { MaintenanceTask } from "@/types/maintenance";
import SpeechToTextButton from "../ui/SpeechToTextButton";

interface Props {
  onComplaintTranscript: (text: string) => void;
  onResolutionTranscript: (text: string) => void;
}

const ComplaintResolutionSection: React.FC<Props> = ({
  onComplaintTranscript,
  onResolutionTranscript,
}) => {
  const { register } = useFormContext<Partial<MaintenanceTask>>();

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
      <h3 className="text-lg font-medium text-gray-900 flex items-center">
        Complaint & Resolution
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Complaint Description
            </label>
            <div className="flex">
              <SpeechToTextButton
                onTranscript={onComplaintTranscript}
                language="hi-IN"
                title="Dictate in Hindi"
              />
              <SpeechToTextButton
                onTranscript={onComplaintTranscript}
                language="mr-IN"
                title="Dictate in Marathi"
                buttonClassName="ml-2"
              />
              <SpeechToTextButton
                onTranscript={onComplaintTranscript}
                language="en-IN"
                title="Dictate in English"
                buttonClassName="ml-2"
              />
            </div>
          </div>
          <textarea
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            placeholder="Detailed description of the complaint or issue..."
            {...register("complaint_description")}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Resolution Summary
            </label>
            <div className="flex">
              <SpeechToTextButton
                onTranscript={onResolutionTranscript}
                language="hi-IN"
                title="Dictate in Hindi"
              />
              <SpeechToTextButton
                onTranscript={onResolutionTranscript}
                language="mr-IN"
                title="Dictate in Marathi"
                buttonClassName="ml-2"
              />
              <SpeechToTextButton
                onTranscript={onResolutionTranscript}
                language="en-IN"
                title="Dictate in English"
                buttonClassName="ml-2"
              />
            </div>
          </div>
          <textarea
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            placeholder="Summary of the resolution or fix applied..."
            {...register("resolution_summary")}
          />
        </div>
      </div>
    </div>
  );
};

export default ComplaintResolutionSection;
