// Script to check for and create missing tables
require('dotenv').config();

// This script uses the Supabase Javascript client to check for required tables
// It will then create any missing tables with proper schema
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Should be service role key for this script

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('Error: SUPABASE_URL and SUPABASE_KEY must be set in the .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTable(tableName) {
  console.log(`Checking if table '${tableName}' exists...`);
  
  try {
    // Try to select a single row from the table
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') { // undefined_table PostgreSQL error code
        console.log(`Table '${tableName}' does not exist.`);
        return false;
      } else {
        console.error(`Error checking table '${tableName}':`, error);
        return null; // Unknown status
      }
    }
    
    console.log(`Table '${tableName}' exists.`);
    return true;
  } catch (err) {
    console.error(`Exception checking table '${tableName}':`, err);
    return null; // Unknown status
  }
}

async function createSitterUnavailabilityTable() {
  console.log('Creating sitter_unavailability table...');
  
  try {
    // Enable UUID extension
    await supabase.rpc('create_extension', { name: 'uuid-ossp' });
    
    // Create the table
    const { error } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'sitter_unavailability',
      table_definition: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sitter_id UUID NOT NULL REFERENCES profiles(id),
        unavailable_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE (sitter_id, unavailable_date)
      `
    });
    
    if (error) {
      console.log('Error creating sitter_unavailability table:', error);
      return false;
    }
    
    // Create index
    const { error: indexError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_sitter_unavailability_sitter_date 
        ON sitter_unavailability (sitter_id, unavailable_date);
      `
    });
    
    if (indexError) {
      console.log('Error creating index for sitter_unavailability:', indexError);
      return false;
    }
    
    console.log('Successfully created sitter_unavailability table and index.');
    return true;
  } catch (err) {
    console.log('Exception creating sitter_unavailability table:', err);
    return false;
  }
}

async function main() {
  console.log('Checking for required tables...');
  
  // Check sitter_unavailability table
  const sitterUnavailabilityExists = await checkTable('sitter_unavailability');
  
  if (sitterUnavailabilityExists === false) {
    console.log('Attempting to create missing sitter_unavailability table...');
    const created = await createSitterUnavailabilityTable();
    if (created) {
      console.log('Successfully created sitter_unavailability table!');
    } else {
      console.log('Failed to create sitter_unavailability table.');
      console.log('\nPlease run the SQL script manually:');
      console.log('1. Log into your Supabase dashboard');
      console.log('2. Go to the SQL Editor');
      console.log('3. Run the contents of scripts/create_unavailability_table.sql');
    }
  }
  
  console.log('\nTable verification complete!');
}

main().catch(err => {
  console.log('Fatal error:', err);
  process.exit(1);
}); 