import { create } from 'zustand';
import { EvaluationForm, AuditLogEntry, KPIEntry, calculateWeightedScore, getClassification } from '@/types/evaluation';
import { MOCK_EVALUATIONS, MOCK_AUDIT_LOG } from './mockData';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  timestamp: string;
  read: boolean;
}

interface EvaluationState {
  evaluations: EvaluationForm[];
  auditLog: AuditLogEntry[];
  notifications: Notification[];
  
  getEvaluationsByEmployee: (employeeId: string) => EvaluationForm[];
  getEvaluationsByManager: (managerId: string) => EvaluationForm[];
  getEvaluationById: (id: string) => EvaluationForm | undefined;
  
  createEvaluation: (form: Omit<EvaluationForm, 'id' | 'totalScore' | 'classification' | 'createdAt' | 'updatedAt'>) => string;
  updateEvaluation: (id: string, updates: Partial<EvaluationForm>) => void;
  submitEvaluation: (id: string) => void;
  approveEvaluation: (id: string, managerRemarks: string) => void;
  requestChanges: (id: string, remarks: string) => void;
  validateEvaluation: (id: string, hrRemarks: string) => void;
  
  addAuditEntry: (entry: Omit<AuditLogEntry, 'id'>) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
}

export const useEvaluationStore = create<EvaluationState>((set, get) => ({
  evaluations: MOCK_EVALUATIONS,
  auditLog: MOCK_AUDIT_LOG,
  notifications: [
    { id: 'n1', message: 'Performance Cycle 2024 is now open for submissions.', type: 'info', timestamp: '2024-11-01T09:00:00Z', read: false },
    { id: 'n2', message: 'Sarah Chen has submitted evaluation for review.', type: 'warning', timestamp: '2024-12-01T14:30:00Z', read: false },
  ],

  getEvaluationsByEmployee: (employeeId) => get().evaluations.filter(e => e.employeeId === employeeId),
  getEvaluationsByManager: () => get().evaluations.filter(e => e.status === 'submitted' || e.status === 'under_review'),
  getEvaluationById: (id) => get().evaluations.find(e => e.id === id),

  createEvaluation: (form) => {
    const id = `ev${Date.now()}`;
    const now = new Date().toISOString();
    const evaluation: EvaluationForm = {
      ...form,
      id,
      totalScore: 0,
      classification: 'Very Poor',
      createdAt: now,
      updatedAt: now,
    };
    evaluation.totalScore = calculateWeightedScore(evaluation);
    evaluation.classification = getClassification(evaluation.totalScore);
    set(s => ({ evaluations: [...s.evaluations, evaluation] }));
    return id;
  },

  updateEvaluation: (id, updates) => {
    set(s => ({
      evaluations: s.evaluations.map(e => {
        if (e.id !== id) return e;
        const updated = { ...e, ...updates, updatedAt: new Date().toISOString() };
        updated.totalScore = calculateWeightedScore(updated);
        updated.classification = getClassification(updated.totalScore);
        return updated;
      }),
    }));
  },

  submitEvaluation: (id) => {
    set(s => ({
      evaluations: s.evaluations.map(e =>
        e.id === id ? { ...e, status: 'submitted' as const, submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : e
      ),
    }));
  },

  approveEvaluation: (id, managerRemarks) => {
    set(s => ({
      evaluations: s.evaluations.map(e =>
        e.id === id ? { ...e, status: 'approved' as const, managerRemarks, approvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : e
      ),
    }));
  },

  requestChanges: (id, remarks) => {
    set(s => ({
      evaluations: s.evaluations.map(e =>
        e.id === id ? { ...e, status: 'changes_requested' as const, managerRemarks: remarks, updatedAt: new Date().toISOString() } : e
      ),
    }));
  },

  validateEvaluation: (id, hrRemarks) => {
    set(s => ({
      evaluations: s.evaluations.map(e =>
        e.id === id ? { ...e, status: 'validated' as const, hrRemarks, updatedAt: new Date().toISOString() } : e
      ),
    }));
  },

  addAuditEntry: (entry) => {
    set(s => ({ auditLog: [...s.auditLog, { ...entry, id: `a${Date.now()}` }] }));
  },

  addNotification: (notification) => {
    set(s => ({ notifications: [{ ...notification, id: `n${Date.now()}`, read: false }, ...s.notifications] }));
  },

  markNotificationRead: (id) => {
    set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
  },
}));
