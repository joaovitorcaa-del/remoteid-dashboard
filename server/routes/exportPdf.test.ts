import { describe, it, expect, beforeEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import exportPdfRouter from './exportPdf';

describe('Export PDF Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/export', exportPdfRouter);
  });

  it('should generate PDF with valid dashboard data', async () => {
    const dashboardData = {
      metrics: {
        projectHealth: 'green',
        completionRate: 75,
        totalIssues: 100,
        doneIssues: 75,
        inProgressIssues: 20,
        canceledIssues: 5,
        qaGargaloCount: 10,
        devAndCodeReviewCount: 8,
        backlogCount: 5,
      },
      statusDistribution: [
        { status: 'Done', count: 75 },
        { status: 'In Progress', count: 20 },
        { status: 'To Do', count: 5 },
      ],
      criticalIssues: [],
      impediments: [],
      dynamicSteps: [
        {
          id: 1,
          title: 'Test Step',
          description: 'This is a test step',
          priority: 'high',
        },
      ],
    };

    const response = await request(app)
      .post('/api/export/pdf')
      .send({
        dashboardData,
        fileName: 'test-dashboard',
      });

    expect(response.status).toBe(200);
    expect(response.type).toBe('application/pdf');
    expect(response.body).toBeInstanceOf(Buffer);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('test-dashboard');
  });

  it('should handle missing dashboard data gracefully', async () => {
    const response = await request(app)
      .post('/api/export/pdf')
      .send({
        dashboardData: null,
        fileName: 'test-dashboard',
      });

    expect(response.status).toBe(200);
    expect(response.type).toBe('application/pdf');
    expect(response.body).toBeInstanceOf(Buffer);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('should use default fileName when not provided', async () => {
    const dashboardData = {
      metrics: {
        completionRate: 50,
        totalIssues: 100,
      },
    };

    const response = await request(app)
      .post('/api/export/pdf')
      .send({
        dashboardData,
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain('remoteid-dashboard');
  });

  it('should include all dashboard data in the PDF', async () => {
    const dashboardData = {
      metrics: {
        projectHealth: 'red',
        completionRate: 62.4,
        totalIssues: 125,
        doneIssues: 78,
        inProgressIssues: 47,
        canceledIssues: 0,
        qaGargaloCount: 25,
        devAndCodeReviewCount: 6,
        backlogCount: 0,
      },
      statusDistribution: [
        { status: 'Done', count: 78 },
        { status: 'In Progress', count: 47 },
      ],
      criticalIssues: [
        {
          key: 'ISSUE-1',
          summary: 'Critical Issue',
          description: 'This is a critical issue',
        },
      ],
      impediments: [
        {
          title: 'Resource Constraint',
          priority: 'High',
          description: 'Not enough resources',
        },
      ],
      dynamicSteps: [
        {
          id: 1,
          title: 'Increase QA Capacity',
          description: 'Add more QA resources',
          priority: 'high',
        },
      ],
    };

    const response = await request(app)
      .post('/api/export/pdf')
      .send({
        dashboardData,
        fileName: 'comprehensive-dashboard',
      });

    expect(response.status).toBe(200);
    expect(response.type).toBe('application/pdf');
    expect(response.body).toBeInstanceOf(Buffer);
    expect(response.body.length).toBeGreaterThan(1000); // PDF should be at least 1KB
  });
});
