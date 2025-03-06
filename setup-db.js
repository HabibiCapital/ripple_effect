const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createTableQuery = `
CREATE TABLE IF NOT EXISTS deeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  impact INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
`;

async function setupDatabase() {
  try {
    await pool.query(createTableQuery);
    console.log('Deeds table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating deeds table:', error);
    process.exit(1);
  }
}

setupDatabase(); 