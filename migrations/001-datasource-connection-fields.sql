-- Migration: Split connectionString into separate connection fields
-- This migration updates the data_sources table to use separate connection fields
-- instead of a single connectionString field.

-- Step 1: Add new columns
ALTER TABLE data_sources 
ADD COLUMN server VARCHAR(255),
ADD COLUMN port INT,
ADD COLUMN database VARCHAR(255),
ADD COLUMN username VARCHAR(255),
ADD COLUMN password VARCHAR(255);

-- Step 2: Migrate existing data (example for SQL Server connection strings)
-- This assumes connection strings in format: "Server=...;Database=...;User ID=...;Password=...;"
-- You may need to customize this based on your actual data format

UPDATE data_sources
SET 
  server = CASE 
    WHEN connectionString LIKE '%Server=%' THEN 
      SUBSTRING(connectionString, 
        CHARINDEX('Server=', connectionString) + 7,
        CASE 
          WHEN CHARINDEX(';', connectionString, CHARINDEX('Server=', connectionString)) > 0 
          THEN CHARINDEX(';', connectionString, CHARINDEX('Server=', connectionString)) - CHARINDEX('Server=', connectionString) - 7
          ELSE LEN(connectionString)
        END
      )
    ELSE 'localhost'
  END,
  port = CASE 
    WHEN connectionString LIKE '%Port=%' THEN 
      CAST(SUBSTRING(connectionString, 
        CHARINDEX('Port=', connectionString) + 5,
        CASE 
          WHEN CHARINDEX(';', connectionString, CHARINDEX('Port=', connectionString)) > 0 
          THEN CHARINDEX(';', connectionString, CHARINDEX('Port=', connectionString)) - CHARINDEX('Port=', connectionString) - 5
          ELSE LEN(connectionString)
        END
      ) AS INT)
    ELSE 1433
  END,
  database = CASE 
    WHEN connectionString LIKE '%Database=%' THEN 
      SUBSTRING(connectionString, 
        CHARINDEX('Database=', connectionString) + 9,
        CASE 
          WHEN CHARINDEX(';', connectionString, CHARINDEX('Database=', connectionString)) > 0 
          THEN CHARINDEX(';', connectionString, CHARINDEX('Database=', connectionString)) - CHARINDEX('Database=', connectionString) - 9
          ELSE LEN(connectionString)
        END
      )
    ELSE ''
  END,
  username = CASE 
    WHEN connectionString LIKE '%User ID=%' THEN 
      SUBSTRING(connectionString, 
        CHARINDEX('User ID=', connectionString) + 8,
        CASE 
          WHEN CHARINDEX(';', connectionString, CHARINDEX('User ID=', connectionString)) > 0 
          THEN CHARINDEX(';', connectionString, CHARINDEX('User ID=', connectionString)) - CHARINDEX('User ID=', connectionString) - 8
          ELSE LEN(connectionString)
        END
      )
    ELSE ''
  END,
  password = CASE 
    WHEN connectionString LIKE '%Password=%' THEN 
      SUBSTRING(connectionString, 
        CHARINDEX('Password=', connectionString) + 9,
        CASE 
          WHEN CHARINDEX(';', connectionString, CHARINDEX('Password=', connectionString)) > 0 
          THEN CHARINDEX(';', connectionString, CHARINDEX('Password=', connectionString)) - CHARINDEX('Password=', connectionString) - 9
          ELSE LEN(connectionString)
        END
      )
    ELSE ''
  END
WHERE connectionString IS NOT NULL;

-- Step 3: Make new columns NOT NULL (after data migration)
ALTER TABLE data_sources 
ALTER COLUMN server VARCHAR(255) NOT NULL;

ALTER TABLE data_sources 
ALTER COLUMN database VARCHAR(255) NOT NULL;

ALTER TABLE data_sources 
ALTER COLUMN username VARCHAR(255) NOT NULL;

ALTER TABLE data_sources 
ALTER COLUMN password VARCHAR(255) NOT NULL;

-- Step 4: Drop the old connectionString column
ALTER TABLE data_sources 
DROP COLUMN connectionString;

-- Step 5: Verify migration
SELECT id, name, server, port, database, username FROM data_sources;

