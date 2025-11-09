import React, { useState, useEffect, useRef } from "react";
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
  const { register, watch, setValue } = useFormContext<Partial<MaintenanceTask>>();

  // Watch the form values for controlled textareas
  const complaintDescription = watch("complaint_description") || "";
  const resolutionSummary = watch("resolution_summary") || "";

  // State for interim transcripts (real-time display)
  const [interimComplaint, setInterimComplaint] = useState("");
  const [interimResolution, setInterimResolution] = useState("");

  // Refs for textareas to allow focusing
  const complaintTextareaRef = useRef<HTMLTextAreaElement>(null);
  const resolutionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle interim transcripts for real-time display
  const handleComplaintInterim = (text: string) => {
    console.log('🎙️ Complaint interim transcript:', text);
    setInterimComplaint(text);
  };

  const handleResolutionInterim = (text: string) => {
    setInterimResolution(text);
  };

  // Handle final transcripts - append to existing text
  const handleComplaintFinal = (text: string) => {
    console.log('🎤 Complaint final transcript received:', text);
    const currentText = complaintDescription || "";
    const newText = currentText ? `${currentText} ${text}` : text;
    console.log('📝 Setting complaint_description to:', newText);
    setValue("complaint_description", newText);
    setInterimComplaint(""); // Clear interim text
    onComplaintTranscript(text);
  };

  const handleResolutionFinal = (text: string) => {
    const currentText = resolutionSummary || "";
    const newText = currentText ? `${currentText} ${text}` : text;
    setValue("resolution_summary", newText);
    setInterimResolution(""); // Clear interim text
    onResolutionTranscript(text);
  };

  // Clear interim text when recognition ends
  useEffect(() => {
    const timer = setTimeout(() => {
      setInterimComplaint("");
      setInterimResolution("");
    }, 1000);
    return () => clearTimeout(timer);
  }, [complaintDescription, resolutionSummary]);

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
                onTranscript={handleComplaintFinal}
                onInterimTranscript={handleComplaintInterim}
                onStart={() => complaintTextareaRef.current?.focus()}
                language="hi-IN"
                title="Dictate in Hindi"
                maxDuration={10000}
              />
              <SpeechToTextButton
                onTranscript={handleComplaintFinal}
                onInterimTranscript={handleComplaintInterim}
                onStart={() => complaintTextareaRef.current?.focus()}
                language="mr-IN"
                title="Dictate in Marathi"
                buttonClassName="ml-2"
                maxDuration={10000}
              />
              <SpeechToTextButton
                onTranscript={handleComplaintFinal}
                onInterimTranscript={handleComplaintInterim}
                onStart={() => complaintTextareaRef.current?.focus()}
                language="en-IN"
                title="Dictate in English"
                buttonClassName="ml-2"
                maxDuration={10000}
              />
            </div>
          </div>
          <textarea
            ref={complaintTextareaRef}
            className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 resize-y"
            placeholder="Detailed description of the complaint or issue..."
            value={(complaintDescription || "") + (interimComplaint ? ` ${interimComplaint}` : "")}
            onChange={(e) => {
              const fullValue = e.target.value;
              // If interim text exists, remove it from the end
              if (interimComplaint && fullValue.endsWith(interimComplaint)) {
                const valueWithoutInterim = fullValue.slice(0, -interimComplaint.length).trim();
                setValue("complaint_description", valueWithoutInterim);
              } else {
                setValue("complaint_description", fullValue);
                setInterimComplaint("");
              }
            }}
            style={{ color: '#111827', backgroundColor: '#ffffff' }}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Resolution Summary
            </label>
            <div className="flex">
              <SpeechToTextButton
                onTranscript={handleResolutionFinal}
                onInterimTranscript={handleResolutionInterim}
                onStart={() => resolutionTextareaRef.current?.focus()}
                language="hi-IN"
                title="Dictate in Hindi"
                maxDuration={10000}
              />
              <SpeechToTextButton
                onTranscript={handleResolutionFinal}
                onInterimTranscript={handleResolutionInterim}
                onStart={() => resolutionTextareaRef.current?.focus()}
                language="mr-IN"
                title="Dictate in Marathi"
                buttonClassName="ml-2"
                maxDuration={10000}
              />
              <SpeechToTextButton
                onTranscript={handleResolutionFinal}
                onInterimTranscript={handleResolutionInterim}
                onStart={() => resolutionTextareaRef.current?.focus()}
                language="en-IN"
                title="Dictate in English"
                buttonClassName="ml-2"
                maxDuration={10000}
              />
            </div>
          </div>
          <textarea
            ref={resolutionTextareaRef}
            className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 resize-y"
            placeholder="Summary of the resolution or fix applied..."
            value={(resolutionSummary || "") + (interimResolution ? ` ${interimResolution}` : "")}
            onChange={(e) => {
              const fullValue = e.target.value;
              // If interim text exists, remove it from the end
              if (interimResolution && fullValue.endsWith(interimResolution)) {
                const valueWithoutInterim = fullValue.slice(0, -interimResolution.length).trim();
                setValue("resolution_summary", valueWithoutInterim);
              } else {
                setValue("resolution_summary", fullValue);
                setInterimResolution("");
              }
            }}
            style={{ color: '#111827', backgroundColor: '#ffffff' }}
          />
        </div>
      </div>
    </div>
  );
};

export default ComplaintResolutionSection;
