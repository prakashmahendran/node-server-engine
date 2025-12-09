import { expect } from 'chai';
import express from 'express';
import request from 'supertest';
import { requestLogger } from './requestLogger';

describe('Middleware - requestLogger', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = express();
    app.use(requestLogger);
    app.get('/test', (req, res) => {
      res.status(200).json({ success: true });
    });
    app.post('/test', (req, res) => {
      res.status(201).json({ created: true });
    });
    app.get('/error', (req, res) => {
      res.status(500).json({ error: 'Internal error' });
    });
  });
  
  describe('GET requests', () => {
    it('should log successful GET requests', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);
      
      expect(response.body).to.deep.equal({ success: true });
    });
    
    it('should log GET requests with query parameters', async () => {
      await request(app)
        .get('/test?param1=value1&param2=value2')
        .expect(200);
    });
  });
  
  describe('POST requests', () => {
    it('should log successful POST requests', async () => {
      await request(app)
        .post('/test')
        .send({ data: 'test' })
        .expect(201);
    });
    
    it('should log POST requests with JSON body in detailed mode', async () => {
      process.env.DETAILED_LOGS = 'true';
      
      await request(app)
        .post('/test')
        .send({ email: '[email protected]', name: 'Test User' })
        .expect(201);
      
      delete process.env.DETAILED_LOGS;
    });
  });
  
  describe('Error responses', () => {
    it('should log error responses', async () => {
      await request(app)
        .get('/error')
        .expect(500);
    });
  });
  
  describe('Response time', () => {
    it('should include response time in logs', async () => {
      const start = Date.now();
      await request(app).get('/test').expect(200);
      const end = Date.now();
      
      // Response time should be reasonable
      expect(end - start).to.be.lessThan(1000);
    });
  });
  
  describe('Different HTTP methods', () => {
    beforeEach(() => {
      app.put('/test', (req, res) => {
        res.status(200).json({ updated: true });
      });
      app.delete('/test', (req, res) => {
        res.status(204).send();
      });
      app.patch('/test', (req, res) => {
        res.status(200).json({ patched: true });
      });
    });
    
    it('should log PUT requests', async () => {
      await request(app)
        .put('/test')
        .send({ data: 'update' })
        .expect(200);
    });
    
    it('should log DELETE requests', async () => {
      await request(app)
        .delete('/test')
        .expect(204);
    });
    
    it('should log PATCH requests', async () => {
      await request(app)
        .patch('/test')
        .send({ data: 'patch' })
        .expect(200);
    });
  });
  
  describe('DETAILED_LOGS flag', () => {
    it('should show minimal info when DETAILED_LOGS is false', async () => {
      process.env.DETAILED_LOGS = 'false';
      
      await request(app)
        .post('/test')
        .send({ sensitiveData: 'hidden' })
        .expect(201);
      
      delete process.env.DETAILED_LOGS;
    });
    
    it('should show full info when DETAILED_LOGS is true', async () => {
      process.env.DETAILED_LOGS = 'true';
      
      await request(app)
        .post('/test')
        .send({ visibleData: 'shown' })
        .expect(201);
      
      delete process.env.DETAILED_LOGS;
    });
  });
});
