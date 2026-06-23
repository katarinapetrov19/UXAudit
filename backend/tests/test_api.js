const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function test() {
  try {
    console.log('Testing registration...');
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      email: `test_${Date.now()}@example.com`,
      password: 'password123'
    });
    const { api_key, id } = regRes.data;
    console.log('Registered:', id);

    console.log('Testing login...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: regRes.data.email,
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('Logged in, token received');

    console.log('Testing status with API key...');
    const statusRes = await axios.get(`${BASE_URL}/status`, {
      headers: { 'x-api-key': api_key }
    });
    console.log('Status (API key):', statusRes.data.plan);

    console.log('Testing status with JWT...');
    const statusResJwt = await axios.get(`${BASE_URL}/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status (JWT):', statusResJwt.data.plan);

    console.log('All basic tests passed!');
  } catch (err) {
    console.error('Test failed:', err.response ? err.response.data : err.message);
  }
}

test();
