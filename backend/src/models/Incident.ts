import mongoose, { Schema } from 'mongoose';
import type { IncidentAnalysis, IncidentFeedback, IncidentSeverity, IncidentStatus } from '../types/incident.js';

export interface IncidentDocument extends mongoose.Document {
  id: string;
  title: string;
  service: string;
  environment: string;
  severity: IncidentSeverity;
  error: string;
  logs: string;
  status: IncidentStatus;
  analysis?: IncidentAnalysis;
  feedback?: IncidentFeedback;
  createdAt: Date;
  updatedAt: Date;
}

const incidentSchema = new Schema<IncidentDocument>(
  {
    id: { type: String, required: true, unique: true, default: () => `INC-${Date.now()}` },
    title: { type: String, required: true, trim: true },
    service: { type: String, required: true, trim: true },
    environment: { type: String, required: true, trim: true },
    severity: { type: String, required: true, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    error: { type: String, required: true, trim: true },
    logs: { type: String, default: '' },
    status: { type: String, enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'LEARNING'], default: 'OPEN' },
    analysis: { type: Schema.Types.Mixed },
    feedback: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const Incident = mongoose.model<IncidentDocument>('Incident', incidentSchema);
