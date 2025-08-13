import React from "react";
import { useForm, Controller } from "react-hook-form";

type FormData = {
  document_type: string;
  document_name: string;
  issue_date?: string;
  expiry_date?: string;
  cost?: number;
  notes?: string;
  file?: FileList;
};

export default function DocumentForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const { register, handleSubmit, control, reset } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    console.log("DocumentForm submit:", data); // TODO: insert into public.documents
    onSubmitted?.();
    reset();
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-3">
        <input className="input input-bordered" placeholder="Document Type" {...register("document_type", { required: true })} />
        <input className="input input-bordered" placeholder="Document Name" {...register("document_name", { required: true })} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input input-bordered" type="date" {...register("issue_date")} />
          <input className="input input-bordered" type="date" {...register("expiry_date")} />
        </div>
        <input className="input input-bordered" type="number" step="0.01" placeholder="Cost (optional)" {...register("cost")} />
        <textarea className="textarea textarea-bordered" placeholder="Notes" rows={3} {...register("notes")} />
        <Controller name="file" control={control} render={({ field }) => (
          <input type="file" className="file-input file-input-bordered" onChange={(e) => field.onChange(e.target.files)} />
        )} />
      </div>
      <button type="submit" className="btn btn-primary">Save Document</button>
    </form>
  );
}