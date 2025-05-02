CREATE OR REPLACE FUNCTION func_update_users_log()
RETURNS TRIGGER AS $$
BEGIN
        IF (
			NEW.name IS DISTINCT FROM OLD.name OR 
            NEW.email IS DISTINCT FROM OLD.email OR 
            NEW.phone IS DISTINCT FROM OLD.phone OR 
            NEW.hashed_password IS DISTINCT FROM OLD.hashed_password OR 
            NEW.is_system_admin IS DISTINCT FROM OLD.is_system_admin OR 
            NEW.group_id IS DISTINCT FROM OLD.group_id OR 
            NEW.permissions IS DISTINCT FROM OLD.permissions OR 
            NEW.extra_metadata IS DISTINCT FROM OLD.extra_metadata OR 
            NEW.disabled IS DISTINCT FROM OLD.disabled OR 
            NEW.comment IS DISTINCT FROM OLD.comment
        ) THEN
            NEW.log := COALESCE(OLD.log, '[]'::JSONB) || jsonb_build_object(
            'name', OLD.name,
            'email', OLD.email,
            'phone', OLD.phone,
            'hashed_password', OLD.hashed_password,
            'is_system_admin', OLD.is_system_admin,
            'group_id', OLD.group_id,
            'permissions', OLD.permissions,
            'extra_metadata', OLD.extra_metadata,
            'comment', OLD.comment,
            'entryDateTime', OLD.entry_date_time
        );
        END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trg_update_users_log
BEFORE UPDATE ON users
FOR EACH row
EXECUTE FUNCTION func_update_users_log();