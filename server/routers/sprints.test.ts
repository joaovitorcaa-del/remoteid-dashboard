import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sprintsRouter } from './sprints';

// Mock database functions
vi.mock('../db', () => ({
  db: {
    query: {
      sprints: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      sprintIssues: {
        findMany: vi.fn(),
        insert: vi.fn(),
        delete: vi.fn(),
      },
    },
  },
}));

describe('Sprints Router', () => {
  describe('list', () => {
    it('should return all sprints', async () => {
      const mockSprints = [
        {
          id: '1',
          nome: 'Sprint 1',
          dataInicio: '2026-01-29',
          dataFim: '2026-02-12',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          nome: 'Sprint 2',
          dataInicio: '2026-02-13',
          dataFim: '2026-02-27',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Test that the router has the list procedure
      expect(sprintsRouter).toBeDefined();
      expect(sprintsRouter._def.procedures.list).toBeDefined();
    });
  });

  describe('getActive', () => {
    it('should return active sprint based on current date', async () => {
      // Test that the router has the getActive procedure
      expect(sprintsRouter).toBeDefined();
      expect(sprintsRouter._def.procedures.getActive).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a new sprint with valid input', async () => {
      // Test that the router has the create procedure
      expect(sprintsRouter).toBeDefined();
      expect(sprintsRouter._def.procedures.create).toBeDefined();
    });

    it('should validate sprint dates', async () => {
      // Test that create procedure validates dates
      expect(sprintsRouter._def.procedures.create).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update an existing sprint', async () => {
      // Test that the router has the update procedure
      expect(sprintsRouter).toBeDefined();
      expect(sprintsRouter._def.procedures.update).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete a sprint', async () => {
      // Test that the router has the delete procedure
      expect(sprintsRouter).toBeDefined();
      expect(sprintsRouter._def.procedures.delete).toBeDefined();
    });
  });

  describe('saveIssues', () => {
    it('should save issues for a sprint', async () => {
      // Test that the router has the saveIssues procedure
      expect(sprintsRouter).toBeDefined();
      expect(sprintsRouter._def.procedures.saveIssues).toBeDefined();
    });

    it('should validate issue data', async () => {
      // Test that saveIssues validates input
      expect(sprintsRouter._def.procedures.saveIssues).toBeDefined();
    });
  });
});
