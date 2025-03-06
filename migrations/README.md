# PostgreSQL Earthdistance Address Migration

This directory contains SQL migrations for implementing location-based functionality in the addresses table using PostgreSQL's `earthdistance` extension.

## Why earthdistance?

We're using PostgreSQL's native `earthdistance` extension instead of PostGIS because:

1. It's much simpler to set up and use
2. It uses the built-in `point` data type which has good Supabase support
3. It's sufficient for basic distance calculations (find addresses within X kilometers)
4. It doesn't require as many dependencies as PostGIS

## Migration Files

- `address_location_functions.sql` - Adds earthdistance extension, creates an index for location column, and ensures the location column exists as a PostgreSQL point type

## How to Apply Migrations

### Option 1: Direct SQL in Supabase Dashboard

1. Copy the contents of the SQL files
2. Open your Supabase project dashboard
3. Go to the SQL Editor
4. Paste the SQL and run it

### Option 2: Using psql (if you have direct database access)

```bash
# Replace these values with your actual Supabase connection details
export PGHOST=db.<your-project-id>.supabase.co
export PGDATABASE=postgres
export PGUSER=postgres
export PGPASSWORD=<your-password>
export PGPORT=5432

# Run the migration
psql -f migrations/address_location_functions.sql
```

## Testing the Migration

After applying the migration, you can verify it worked by checking:

1. The cube and earthdistance extensions exist
2. The addresses table has a location column of type point
3. There's an index on the location column

Example verification query:

```sql
-- Check if required extensions exist
SELECT extname FROM pg_extension WHERE extname IN ('cube', 'earthdistance');

-- Check if location column exists with correct type
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'addresses' AND column_name = 'location';

-- Check if index exists
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'addresses' AND indexname = 'addresses_location_idx';
```

## Using Earthdistance in Queries

Once set up, you can use earthdistance to find addresses within a certain distance:

```sql
-- Find addresses within 10km of a point (latitude 37.7749, longitude -122.4194)
SELECT * FROM addresses
WHERE earth_distance(
  ll_to_earth(location[1], location[0]), -- latitude is y, longitude is x
  ll_to_earth(37.7749, -122.4194)
) < 10000; -- distance in meters
``` 