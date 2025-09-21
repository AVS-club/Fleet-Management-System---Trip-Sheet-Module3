DROP MATERIALIZED VIEW IF EXISTS document_summary;

CREATE MATERIALIZED VIEW document_summary AS
SELECT 
  v.id,
  v.registration_number,
  v.registration_date,
  v.registration_date + INTERVAL '15 years' as rc_expiry_calculated,
  v.insurance_expiry_date,
  v.fitness_expiry_date,
  v.permit_expiry_date,
  v.puc_expiry_date,
  v.tax_paid_upto as tax_expiry_date,
  v.rc_expiry_date,
  v.vahan_last_fetched_at,
  CASE 
    WHEN v.insurance_expiry_date IS NULL THEN 'missing'
    WHEN v.insurance_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN v.insurance_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as insurance_status,
  CASE 
    WHEN v.fitness_expiry_date IS NULL THEN 'missing'
    WHEN v.fitness_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN v.fitness_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as fitness_status,
  CASE 
    WHEN v.permit_expiry_date IS NULL THEN 'missing'
    WHEN v.permit_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN v.permit_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as permit_status,
  CASE 
    WHEN v.puc_expiry_date IS NULL THEN 'missing'
    WHEN v.puc_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN v.puc_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as puc_status,
  CASE 
    WHEN v.tax_paid_upto IS NULL THEN 'missing'
    WHEN v.tax_paid_upto < CURRENT_DATE THEN 'expired'
    WHEN v.tax_paid_upto < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as tax_status,
  CASE 
    WHEN (v.registration_date + INTERVAL '15 years') IS NULL THEN 'missing'
    WHEN (v.registration_date + INTERVAL '15 years') < CURRENT_DATE THEN 'expired'
    WHEN (v.registration_date + INTERVAL '15 years') < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as rc_status,
  (
    CASE WHEN v.insurance_expiry_date IS NULL OR v.insurance_expiry_date < CURRENT_DATE THEN 1 ELSE 0 END +
    CASE WHEN v.fitness_expiry_date IS NULL OR v.fitness_expiry_date < CURRENT_DATE THEN 1 ELSE 0 END +
    CASE WHEN v.permit_expiry_date IS NULL OR v.permit_expiry_date < CURRENT_DATE THEN 1 ELSE 0 END +
    CASE WHEN v.puc_expiry_date IS NULL OR v.puc_expiry_date < CURRENT_DATE THEN 1 ELSE 0 END +
    CASE WHEN v.tax_paid_upto IS NULL OR v.tax_paid_upto < CURRENT_DATE THEN 1 ELSE 0 END +
    CASE WHEN (v.registration_date + INTERVAL '15 years') IS NULL OR (v.registration_date + INTERVAL '15 years') < CURRENT_DATE THEN 1 ELSE 0 END
  ) as expired_docs_count,
  (
    CASE WHEN v.insurance_expiry_date >= CURRENT_DATE AND v.insurance_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END +
    CASE WHEN v.fitness_expiry_date >= CURRENT_DATE AND v.fitness_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END +
    CASE WHEN v.permit_expiry_date >= CURRENT_DATE AND v.permit_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END +
    CASE WHEN v.puc_expiry_date >= CURRENT_DATE AND v.puc_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END +
    CASE WHEN v.tax_paid_upto >= CURRENT_DATE AND v.tax_paid_upto < CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END +
    CASE WHEN (v.registration_date + INTERVAL '15 years') >= CURRENT_DATE AND (v.registration_date + INTERVAL '15 years') < CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END
  ) as expiring_docs_count,
  v.created_at,
  v.updated_at
FROM vehicles v
WHERE v.status != 'archived';

CREATE INDEX IF NOT EXISTS idx_document_summary_registration ON document_summary(registration_number);
CREATE INDEX IF NOT EXISTS idx_document_summary_insurance_status ON document_summary(insurance_status);
CREATE INDEX IF NOT EXISTS idx_document_summary_fitness_status ON document_summary(fitness_status);
CREATE INDEX IF NOT EXISTS idx_document_summary_permit_status ON document_summary(permit_status);
CREATE INDEX IF NOT EXISTS idx_document_summary_puc_status ON document_summary(puc_status);
CREATE INDEX IF NOT EXISTS idx_document_summary_tax_status ON document_summary(tax_status);
CREATE INDEX IF NOT EXISTS idx_document_summary_rc_status ON document_summary(rc_status);
CREATE INDEX IF NOT EXISTS idx_document_summary_expired_count ON document_summary(expired_docs_count);
CREATE INDEX IF NOT EXISTS idx_document_summary_expiring_count ON document_summary(expiring_docs_count);

CREATE OR REPLACE FUNCTION refresh_document_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW document_summary;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_vehicle_document_summary(vehicle_id UUID)
RETURNS TABLE (
  id UUID,
  registration_number VARCHAR,
  registration_date DATE,
  rc_expiry_calculated DATE,
  insurance_expiry_date DATE,
  fitness_expiry_date DATE,
  permit_expiry_date DATE,
  puc_expiry_date DATE,
  tax_expiry_date DATE,
  rc_expiry_date DATE,
  vahan_last_fetched_at TIMESTAMPTZ,
  insurance_status TEXT,
  fitness_status TEXT,
  permit_status TEXT,
  puc_status TEXT,
  tax_status TEXT,
  rc_status TEXT,
  expired_docs_count INTEGER,
  expiring_docs_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.registration_number,
    ds.registration_date,
    ds.rc_expiry_calculated,
    ds.insurance_expiry_date,
    ds.fitness_expiry_date,
    ds.permit_expiry_date,
    ds.puc_expiry_date,
    ds.tax_expiry_date,
    ds.rc_expiry_date,
    ds.vahan_last_fetched_at,
    ds.insurance_status,
    ds.fitness_status,
    ds.permit_status,
    ds.puc_status,
    ds.tax_status,
    ds.rc_status,
    ds.expired_docs_count,
    ds.expiring_docs_count
  FROM document_summary ds
  WHERE ds.id = vehicle_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_fleet_document_summary_stats()
RETURNS TABLE (
  total_vehicles INTEGER,
  total_expired_docs INTEGER,
  total_expiring_docs INTEGER,
  vehicles_with_expired_docs INTEGER,
  vehicles_with_expiring_docs INTEGER,
  avg_docs_per_vehicle NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_vehicles,
    SUM(expired_docs_count)::INTEGER as total_expired_docs,
    SUM(expiring_docs_count)::INTEGER as total_expiring_docs,
    COUNT(CASE WHEN expired_docs_count > 0 THEN 1 END)::INTEGER as vehicles_with_expired_docs,
    COUNT(CASE WHEN expiring_docs_count > 0 THEN 1 END)::INTEGER as vehicles_with_expiring_docs,
    ROUND(AVG(expired_docs_count + expiring_docs_count), 2) as avg_docs_per_vehicle
  FROM document_summary;
END;
$$ LANGUAGE plpgsql;

GRANT SELECT ON document_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_document_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_vehicle_document_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fleet_document_summary_stats() TO authenticated;
