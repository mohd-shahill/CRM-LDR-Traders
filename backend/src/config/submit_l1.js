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

const l1Details = {
  ownerName: 'Razor Updated',
  ownerPhone: '9876543210',
  ownerEmail: 'razor@updated.com',
  ownerAddress: '123 New Street, Delhi',
  expectedPrice: 25000,
  vehicleRegNumber: 'DL3SS687H',
  make: 'Hyundai Updated',
  model: 'i20 Active',
  year: 2014,
  colour: 'Red',
  fuelType: 'Petrol',
  kmsDriven: 45000,
  bodyCondition: 7,
  engineCondition: 8,
  tyreCondition: 6,
  missingParts: ['Sunroof', 'Spare Tyre'],
  accidentHistory: 'Minor scratch on left side door',
  recommendedPrice: 22000,
  paymentMode: 'upi',
  paymentDetails: { upiId: 'razor@okaxis' }
};

const payload = JSON.stringify(l1Details);

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/leads/lead-828659/l1',
  method: 'PUT',
  headers: {
    'Cookie': `rvsf_employee_token=${token}`,
    'X-Portal': 'employee',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  console.log('Status Code:', res.statusCode);
  
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

req.write(payload);
req.end();
