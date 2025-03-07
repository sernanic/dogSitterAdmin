# Database Setup Scripts

This directory contains SQL scripts for setting up the database tables and functions needed by the application.

## Setting Up Unavailability Tables

The `create_unavailability_table.sql` script sets up the necessary tables and functions for tracking sitter unavailability.

### How to Run the Script

You can run this script in several ways:

#### 1. Using the Supabase Dashboard

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Create a new query
4. Copy and paste the contents of `create_unavailability_table.sql`
5. Run the script

#### 2. Using psql (if you have direct database access)

```bash
psql -h [your-db-host] -d [your-db-name] -U [your-username] -f scripts/create_unavailability_table.sql
```

### Troubleshooting

If you encounter errors when running the script:

1. Make sure the `profiles` table already exists (the script creates a foreign key constraint to it)
2. Check that you have the necessary permissions to create tables and functions
3. If you get a "duplicate key value violates unique constraint" error, the table might already exist

## Testing the Setup

After running the script, you can test if the table was created correctly by running:

```sql
SELECT * FROM sitter_unavailability LIMIT 10;
```

You should see an empty table with columns for `id`, `sitter_id`, `unavailable_date`, and `created_at`.

## Additional Information

The script creates:

1. The `sitter_unavailability` table for storing dates when sitters are unavailable
2. Functions for adding and checking unavailability
3. Indexes for faster queries

For more details on the database schema, refer to the SQL comments in the script. 