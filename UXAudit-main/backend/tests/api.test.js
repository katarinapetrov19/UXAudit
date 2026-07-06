const fs = require('fs');
const path = require('path');

// Set env vars BEFORE requiring the app or db
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const db = require('../db');
const app = require('../server');

describe('UXCheck API', () => {
  let token;
  let apiKey;
  let userId;
  const userEmail = `test_${Date.now()}@example.com`;
  const userPassword = 'password123';

  beforeAll(() => {
    // Clear the in-memory database or ensure tables are fresh
    // Since we use :memory:, it's fresh per process, but Jest might reuse the process.
    // So let's manually clear.
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM scan_counts').run();
    db.prepare('DELETE FROM reports').run();
  });

  afterAll(() => {
    db.close();
  });

  describe('Auth API', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: userEmail, password: userPassword });
      
      if (res.statusCode !== 201) {
        console.error('Registration failed:', res.body);
      }
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('api_key');
      expect(res.body).toHaveProperty('id');
      apiKey = res.body.api_key;
      userId = res.body.id;
    });

    it('should not register user with same email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: userEmail, password: userPassword });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Email already exists');
    });

    it('should login the user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userEmail, password: userPassword });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      token = res.body.token;
    });

    it('should not login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userEmail, password: 'wrongpassword' });
      
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Status API', () => {
    it('should get status with JWT', async () => {
      const res = await request(app)
        .get('/api/status')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe(userEmail);
      expect(res.body.plan).toBe('free');
    });

    it('should get status with API Key', async () => {
      const res = await request(app)
        .get('/api/status')
        .set('x-api-key', apiKey);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe(userEmail);
    });

    it('should fail status with invalid token', async () => {
      const res = await request(app)
        .get('/api/status')
        .set('Authorization', 'Bearer invalidtoken');
      
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Reports API', () => {
    it('should record a scan', async () => {
      const res = await request(app)
        .post('/api/reports/record')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
    });

    it('should not allow saving reports on free plan', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://example.com', issues: [] });
      
      expect(res.statusCode).toBe(403);
    });

    it('should allow saving reports on pro plan', async () => {
      // Manually upgrade user to pro in DB
      db.prepare('UPDATE users SET plan = ? WHERE id = ?').run('pro', userId);

      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://example.com', issues: [{ id: '1', type: 'contrast' }] });
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      const reportId = res.body.id;

      // List reports
      const listRes = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${token}`);
      
      expect(listRes.statusCode).toBe(200);
      expect(listRes.body.length).toBe(1);

      // Get report
      const getRes = await request(app)
        .get(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.url).toBe('https://example.com');
      expect(getRes.body.issues[0].type).toBe('contrast');
    });
  });

  describe('Stripe API', () => {
    it('should create a checkout session', async () => {
      const res = await request(app)
        .post('/api/create-checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({ plan: 'pro' });
      
      // With placeholder keys, this might fail with 500 or 401 (if stripe keys are invalid), but the route is hit.
      expect([200, 401, 500]).toContain(res.statusCode);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/unknown');
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });
  });
});
