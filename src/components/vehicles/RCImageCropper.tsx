import React, { useState, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import 'react-image-crop/dist/ReactCrop.css';
import { FileText, ChevronRight, ChevronLeft, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import Button from '../ui/Button';

interface RCImageCropperProps {
  imageUrl: string;
  onComplete: (croppedAreas: Record<string, PixelCrop>) => void;
  onCancel: () => void;
}

const FIELDS_TO_EXTRACT = [
  { key: 'registrationNumber', label: 'Registration Number' },
  { key: 'chassisNumber', label: 'Chassis Number' },
  { key: 'engineNumber', label: 'Engine Number' },
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'yearOfManufacture', label: 'Year of Manufacture' },
  { key: 'color', label: 'Color' },
  { key: 'fuelType', label: 'Fuel Type' }
];

const RCImageCropper: React.FC<RCImageCropperProps> = ({
  imageUrl,
  onComplete,
  onCancel
}) => {
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [croppedAreas, setCroppedAreas] = useState<Record<string, PixelCrop>>({});
  const [crop, setCrop] = useState<Crop>();
  const [rotation, setRotation] = useState(0);

  const currentField = FIELDS_TO_EXTRACT[currentFieldIndex];
  const isLastField = currentFieldIndex === FIELDS_TO_EXTRACT.length - 1;

  const handleNext = useCallback((crop: PixelCrop) => {
    if (!crop) return;

    const updatedAreas = {
      ...croppedAreas,
      [currentField.key]: crop
    };
    setCroppedAreas(updatedAreas);

    if (isLastField) {
      onComplete(updatedAreas);
    } else {
      setCurrentFieldIndex(currentFieldIndex + 1);
      setCrop(undefined);
    }
  }, [croppedAreas, currentField, currentFieldIndex, isLastField, onComplete]);

  const handleBack = useCallback(() => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(currentFieldIndex - 1);
      setCrop(croppedAreas[FIELDS_TO_EXTRACT[currentFieldIndex - 1].key]);
    }
  }, [currentFieldIndex, croppedAreas]);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-primary-600 mr-2" />
          <div>
            <h4 className="text-primary-800 font-medium">
              Select {currentField.label}
            </h4>
            <p className="text-primary-600 text-sm mt-1">
              Draw a box around the {currentField.label.toLowerCase()} in the image
            </p>
          </div>
        </div>
        <div className="flex items-center mt-2 text-sm text-primary-700">
          <span className="font-medium">
            Step {currentFieldIndex + 1} of {FIELDS_TO_EXTRACT.length}
          </span>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span>{Math.round((currentFieldIndex / FIELDS_TO_EXTRACT.length) * 100)}% complete</span>
        </div>
      </div>

      <div className="relative border rounded-lg overflow-hidden bg-gray-100">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRotate}
            icon={<RotateCw className="h-4 w-4" />}
          >
            Rotate
          </Button>
        </div>

        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={4}
          wheel={{ step: 0.1 }}
        >
          {({ zoomIn, zoomOut }) => (
            <>
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => zoomIn()}
                  icon={<ZoomIn className="h-4 w-4" />}
                >
                  Zoom In
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => zoomOut()}
                  icon={<ZoomOut className="h-4 w-4" />}
                >
                  Zoom Out
                </Button>
              </div>

              <TransformComponent>
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  aspect={undefined}
                >
                  <img
                    src={imageUrl}
                    alt="RC Document"
                    className="max-w-full h-auto"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                </ReactCrop>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        
        <div className="flex gap-2">
          {currentFieldIndex > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              icon={<ChevronLeft className="h-4 w-4" />}
            >
              Back
            </Button>
          )}
          
          <Button
            onClick={() => crop && handleNext(crop)}
            disabled={!crop}
            icon={<ChevronRight className="h-4 w-4" />}
          >
            {isLastField ? 'Complete' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RCImageCropper;