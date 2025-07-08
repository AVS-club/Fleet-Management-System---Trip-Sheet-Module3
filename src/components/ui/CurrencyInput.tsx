import React, { forwardRef } from 'react';
import { IndianRupee } from 'lucide-react';
import Input from './Input';

interface CurrencyInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'icon' | 'type'> {}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ ...props }, ref) => (
    <Input
      ref={ref}
      type="number"
      icon={<IndianRupee className="h-4 w-4" />}
      {...props}
    />
  )
);

export default CurrencyInput;
