import jwt from 'jsonwebtoken';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const token = jwt.sign(
  { id: 'usr-1001', email: 'emp1@ldr.com' },
  process.env.JWT_SECRET || 'super_secret_key_12345',
  { expiresIn: '24h' }
);

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/leads?limit=1000',
  method: 'GET',
  headers: {
    'Cookie': `rvsf_employee_token=${token}`,
    'X-Portal': 'employee',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      console.log('Response Body:', JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log('Response Body (raw):', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
