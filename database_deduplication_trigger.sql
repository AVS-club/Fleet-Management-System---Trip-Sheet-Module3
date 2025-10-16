-- Function to automatically remove duplicate URLs from document arrays
CREATE OR REPLACE FUNCTION remove_duplicate_document_urls()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove duplicates from all document URL arrays
  NEW.rc_document_url := ARRAY(SELECT DISTINCT unnest(NEW.rc_document_url));
  NEW.insurance_document_url := ARRAY(SELECT DISTINCT unnest(NEW.insurance_document_url));
  NEW.fitness_document_url := ARRAY(SELECT DISTINCT unnest(NEW.fitness_document_url));
  NEW.tax_document_url := ARRAY(SELECT DISTINCT unnest(NEW.tax_document_url));
  NEW.permit_document_url := ARRAY(SELECT DISTINCT unnest(NEW.permit_document_url));
  NEW.puc_document_url := ARRAY(SELECT DISTINCT unnest(NEW.puc_document_url));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run on INSERT and UPDATE
DROP TRIGGER IF EXISTS prevent_duplicate_urls ON vehicles;
CREATE TRIGGER prevent_duplicate_urls
BEFORE INSERT OR UPDATE ON vehicles
FOR EACH ROW
EXECUTE FUNCTION remove_duplicate_document_urls();
