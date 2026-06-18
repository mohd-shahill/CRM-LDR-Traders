import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Client, Pool } = pg;

async function checkAndCreateDatabase() {
  const dbName = process.env.PGDATABASE || 'ldr_traders';
  
  // Connection client to default 'postgres' database
  const client = new Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: 'postgres',
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432'),
  });

  try {
    await client.connect();
    
    // Check if the target database exists
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rows.length === 0) {
      console.log(`Database "${dbName}" does not exist. Creating...`);
      // CREATE DATABASE cannot be executed inside a transaction block, so we run it directly on client
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error('Error checking/creating database:', err);
    throw err;
  } finally {
    await client.end();
  }
}

async function init() {
  try {
    // 1. Ensure the database itself exists
    await checkAndCreateDatabase();

    // 2. Establish connection to the target database
    const pool = new Pool({
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE || 'ldr_traders',
      password: process.env.PGPASSWORD,
      port: parseInt(process.env.PGPORT || '5432'),
    });

    console.log('Initializing database tables...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Create tables
      console.log('Dropping existing tables for a clean slate...');
      await client.query('DROP TABLE IF EXISTS onsite_inspections, audit_logs, notifications, leads, users CASCADE;');
      console.log('Creating tables...');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          phone VARCHAR(15) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          permissions TEXT[] DEFAULT '{}',
          is_super_admin BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id VARCHAR(50) PRIMARY KEY,
          owner_name VARCHAR(100) NOT NULL,
          phone VARCHAR(15) NOT NULL,
          alt_phone VARCHAR(15),
          email VARCHAR(100),
          address TEXT,
          vehicle_number VARCHAR(20) UNIQUE NOT NULL,
          make VARCHAR(50),
          model VARCHAR(50),
          year INTEGER,
          colour VARCHAR(30),
          fuel_type VARCHAR(20),
          kms_driven INTEGER,
          body_condition INTEGER,
          options_present TEXT[] DEFAULT '{}',
          expected_price INTEGER,
          wants_new_car BOOLEAN DEFAULT FALSE,
          status VARCHAR(30) DEFAULT 'new',
          assigned_to VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
          submitted_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          l1_details JSONB,
          l2_details JSONB,
          l3_details JSONB,
          l4_details JSONB
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
          lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(50),
          action VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(50),
          previous_state JSONB,
          new_state JSONB,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS onsite_inspections (
          id SERIAL PRIMARY KEY,
          lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE CASCADE,
          inspector_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
          inspected_at TIMESTAMP,
          status VARCHAR(30) DEFAULT 'pending',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed default users
      console.log('Seeding default users...');
      const defaultUsers = [
        {
          id: 'usr-8',
          name: 'Super Admin',
          email: 'admin@ldr.com',
          phone: '9999999999',
          password: 'admin',
          permissions: ['super_admin'],
          is_super_admin: true,
        },
      ];

      for (const u of defaultUsers) {
        const hashedPass = await bcrypt.hash(u.password, 10);
        await client.query(`
          INSERT INTO users (id, name, email, phone, password_hash, permissions, is_super_admin, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            password_hash = EXCLUDED.password_hash,
            permissions = EXCLUDED.permissions,
            is_super_admin = EXCLUDED.is_super_admin;
        `, [u.id, u.name, u.email, u.phone, hashedPass, u.permissions, u.is_super_admin]);
      }

      await client.query('COMMIT');
      console.log('Database initialization and seeding completed successfully!');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error during database table creation:', error);
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

init();
