import React, { forwardRef } from 'react';
import { IndianRupee } from 'lucide-react';
import Input from './Input';

export type CurrencyInputProps = React.ComponentProps<typeof Input>;

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ icon = <IndianRupee className="h-4 w-4" />, type = 'number', ...props }, ref) => {
    return <Input ref={ref} icon={icon} type={type} {...props} />;
  }
);

export default CurrencyInput;
