# Database Migrations

This directory contains manual SQL migration scripts for the Reports API database.

## Running Migrations

Since TypeORM automatic migrations are not currently configured, these migrations should be run manually against your database.

### Steps:

1. **Backup your database** before running any migration
2. Connect to your database using your preferred SQL client
3. Run the migration scripts in order (by filename number)
4. Verify the changes

## Migration Files

### 001-datasource-connection-fields.sql
**Date**: 2025-12-04
**Description**: Converts the `data_sources` table from using a single `connectionString` field to separate connection fields (server, port, database, username, password).

**Before running this migration:**
- Make sure you have a backup of your `data_sources` table
- Review the data migration logic in Step 2 to ensure it matches your connection string format
- Test on a development database first

**What it does:**
1. Adds new columns: `server`, `port`, `database`, `username`, `password`
2. Migrates data from `connectionString` to the new fields
3. Makes the new fields NOT NULL (except `port` which is optional)
4. Drops the old `connectionString` column

**Rollback:** 
If you need to rollback, you can:
1. Add back the `connectionString` column
2. Concatenate the separate fields back into a connection string
3. Drop the new columns

Example rollback SQL:
```sql
-- Add connectionString column back
ALTER TABLE data_sources ADD COLUMN connectionString VARCHAR(500);

-- Rebuild connection strings
UPDATE data_sources 
SET connectionString = CONCAT(
  'Server=', server, 
  CASE WHEN port IS NOT NULL THEN CONCAT(';Port=', CAST(port AS VARCHAR)) ELSE '' END,
  ';Database=', database,
  ';User ID=', username,
  ';Password=', password,
  ';'
);

-- Make it NOT NULL
ALTER TABLE data_sources ALTER COLUMN connectionString VARCHAR(500) NOT NULL;

-- Drop new columns
ALTER TABLE data_sources DROP COLUMN server;
ALTER TABLE data_sources DROP COLUMN port;
ALTER TABLE data_sources DROP COLUMN database;
ALTER TABLE data_sources DROP COLUMN username;
ALTER TABLE data_sources DROP COLUMN password;
```

## Future Migrations

To add new migrations:
1. Create a new file with the next sequential number
2. Include clear comments explaining what the migration does
3. Test thoroughly before running in production
4. Update this README with details about the new migration

