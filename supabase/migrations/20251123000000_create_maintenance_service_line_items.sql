/*
  # Create maintenance_service_line_items table
  
  This table stores line item breakdowns for service tasks,
  allowing detailed cost tracking with quantity, unit price, and subtotal.
  
  1. Schema Changes
    - Create maintenance_service_line_items table
    - Add use_line_items flag to maintenance_service_tasks
    - Create trigger to auto-update service_cost from line items
    - Add indexes for performance
    
  2. Security
    - Enable RLS
    - Add policies for CRUD operations
*/

-- =====================================================
-- STEP 1: Create maintenance_service_line_items table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.maintenance_service_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_task_id UUID NOT NULL REFERENCES public.maintenance_service_tasks(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  item_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_line_items_service_task_id 
  ON public.maintenance_service_line_items (service_task_id);

CREATE INDEX IF NOT EXISTS idx_line_items_order 
  ON public.maintenance_service_line_items (service_task_id, item_order);

-- =====================================================
-- STEP 2: Add use_line_items flag to maintenance_service_tasks
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'use_line_items'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks
    ADD COLUMN use_line_items BOOLEAN DEFAULT false;

    RAISE NOTICE 'Added use_line_items column to maintenance_service_tasks';
  ELSE
    RAISE NOTICE 'use_line_items column already exists in maintenance_service_tasks';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Create function to auto-update service_cost from line items
-- =====================================================
CREATE OR REPLACE FUNCTION update_service_task_cost_from_line_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent maintenance_service_tasks.service_cost
  -- Only update if use_line_items is true
  UPDATE public.maintenance_service_tasks
  SET service_cost = COALESCE(
    (
      SELECT SUM(subtotal) 
      FROM public.maintenance_service_line_items
      WHERE service_task_id = COALESCE(NEW.service_task_id, OLD.service_task_id)
    ),
    0
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.service_task_id, OLD.service_task_id)
    AND use_line_items = true;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: Create triggers for auto-updating service_cost
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_service_cost_from_line_items_insert ON public.maintenance_service_line_items;
DROP TRIGGER IF EXISTS update_service_cost_from_line_items_update ON public.maintenance_service_line_items;
DROP TRIGGER IF EXISTS update_service_cost_from_line_items_delete ON public.maintenance_service_line_items;

-- Trigger on INSERT
CREATE TRIGGER update_service_cost_from_line_items_insert
AFTER INSERT ON public.maintenance_service_line_items
FOR EACH ROW
EXECUTE FUNCTION update_service_task_cost_from_line_items();

-- Trigger on UPDATE (when quantity or unit_price changes)
CREATE TRIGGER update_service_cost_from_line_items_update
AFTER UPDATE OF quantity, unit_price ON public.maintenance_service_line_items
FOR EACH ROW
WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity OR OLD.unit_price IS DISTINCT FROM NEW.unit_price)
EXECUTE FUNCTION update_service_task_cost_from_line_items();

-- Trigger on DELETE
CREATE TRIGGER update_service_cost_from_line_items_delete
AFTER DELETE ON public.maintenance_service_line_items
FOR EACH ROW
EXECUTE FUNCTION update_service_task_cost_from_line_items();

-- =====================================================
-- STEP 5: Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_line_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_update_line_items_updated_at ON public.maintenance_service_line_items;
CREATE TRIGGER trg_update_line_items_updated_at
  BEFORE UPDATE ON public.maintenance_service_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_line_items_updated_at();

-- =====================================================
-- STEP 6: Enable RLS
-- =====================================================
ALTER TABLE public.maintenance_service_line_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 7: Create RLS policies
-- =====================================================

-- SELECT policy: Users can view line items if they own the parent maintenance task
CREATE POLICY "maintenance_service_line_items_select_policy"
ON public.maintenance_service_line_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 
    FROM public.maintenance_service_tasks mst
    INNER JOIN public.maintenance_tasks mt ON mt.id = mst.maintenance_task_id
    WHERE mst.id = maintenance_service_line_items.service_task_id
      AND mt.added_by = auth.uid()
  )
);

-- INSERT policy: Users can insert line items if they own the parent maintenance task
CREATE POLICY "maintenance_service_line_items_insert_policy"
ON public.maintenance_service_line_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.maintenance_service_tasks mst
    INNER JOIN public.maintenance_tasks mt ON mt.id = mst.maintenance_task_id
    WHERE mst.id = maintenance_service_line_items.service_task_id
      AND mt.added_by = auth.uid()
  )
);

-- UPDATE policy: Users can update line items if they own the parent maintenance task
CREATE POLICY "maintenance_service_line_items_update_policy"
ON public.maintenance_service_line_items
FOR UPDATE USING (
  EXISTS (
    SELECT 1 
    FROM public.maintenance_service_tasks mst
    INNER JOIN public.maintenance_tasks mt ON mt.id = mst.maintenance_task_id
    WHERE mst.id = maintenance_service_line_items.service_task_id
      AND mt.added_by = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.maintenance_service_tasks mst
    INNER JOIN public.maintenance_tasks mt ON mt.id = mst.maintenance_task_id
    WHERE mst.id = maintenance_service_line_items.service_task_id
      AND mt.added_by = auth.uid()
  )
);

-- DELETE policy: Users can delete line items if they own the parent maintenance task
CREATE POLICY "maintenance_service_line_items_delete_policy"
ON public.maintenance_service_line_items
FOR DELETE USING (
  EXISTS (
    SELECT 1 
    FROM public.maintenance_service_tasks mst
    INNER JOIN public.maintenance_tasks mt ON mt.id = mst.maintenance_task_id
    WHERE mst.id = maintenance_service_line_items.service_task_id
      AND mt.added_by = auth.uid()
  )
);

-- =====================================================
-- STEP 8: Add comment for documentation
-- =====================================================
COMMENT ON TABLE public.maintenance_service_line_items IS 
  'Stores detailed line item breakdowns for service tasks with quantity, unit price, and auto-calculated subtotals';

COMMENT ON COLUMN public.maintenance_service_line_items.subtotal IS 
  'Auto-calculated as quantity * unit_price using GENERATED ALWAYS AS';

COMMENT ON COLUMN public.maintenance_service_tasks.use_line_items IS 
  'Flag indicating whether this service task uses line items breakdown (true) or simple cost entry (false)';

