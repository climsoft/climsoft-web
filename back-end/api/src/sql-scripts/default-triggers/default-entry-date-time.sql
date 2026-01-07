CREATE OR REPLACE FUNCTION func_set_entry_date_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.entry_date_time = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    table_name TEXT;
    table_names TEXT[] := ARRAY[
        'database_versions',
        'element_subdomains',
        'element_types',
        'elements',        
        'qc_tests',
        'general_settings',
        'network_affiliations',
        'observations',
        'organisations',
        'regions',
        'source_templates', 
        'export_templates',
        'connector_specifications',
        'job_queues',
        'station_forms',
        'station_network_affiliations',
        'station_observation_environments',
        'station_observation_focuses',
        'stations',
        'user_groups',
        'users'
    ]; 
BEGIN
    FOREACH table_name IN ARRAY table_names LOOP
        EXECUTE format('
            CREATE OR REPLACE TRIGGER trg_%I_update_entry_date_time
            BEFORE INSERT OR UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION func_set_entry_date_time()
        ', table_name, table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;