import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

export type Incident = {
  id: string
  title: string
  service: string
  environment: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  error: string
  logs: string
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'LEARNING'
  analysis?: IncidentAnalysis
  feedback?: Feedback
  createdAt: string
  updatedAt: string
}

export type IncidentAnalysis = {
  summary: string
  severityAssessment: string
  likelyCauses: { cause: string; reason: string; confidence: number }[]
  historicalInsights: string[]
  recommendedActions: { step: number; action: string; reason: string; risk: string }[]
  failedApproachesToAvoid: string[]
  confidence: number
  memoryUsed: boolean
}

export type Feedback = {
  outcome: 'SUCCESS' | 'FAILED'
  attemptedAction: string
  actualRootCause: string
  successfulResolution: string
  engineerFeedback: string
  createdAt: string
}

export type Memory = {
  id: string
  text: string
  type: string
  context: string | null
  scores: Record<string, number | null> | null
}

export type DashboardStats = {
  totalIncidents: number
  openIncidents: number
  resolvedIncidents: number
  learningEvents: number
  failedApproaches: number
  successfulResolutions: number
}

export async function listIncidents() {
  return (await api.get<{ incidents: Incident[] }>('/incidents')).data.incidents
}

export async function getDashboardStats() {
  return (await api.get<DashboardStats>('/dashboard/stats')).data
}

export async function getIncident(id: string) {
  return (await api.get<{ incident: Incident }>(`/incidents/${id}`)).data.incident
}

export async function createIncident(payload: Omit<Incident, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'analysis' | 'feedback'>) {
  return (await api.post<{ incident: Incident }>('/incidents', payload)).data.incident
}

export async function createDemoIncident(scenario: 'mongodb' | 'redis') {
  return (await api.post<{ incident: Incident }>('/incidents/demo', { scenario })).data.incident
}

export async function analyzeIncident(id: string) {
  return (await api.post<{ incident: Incident; analysis: IncidentAnalysis; memories: Memory[]; memoryCount: number }>(`/incidents/${id}/analyze`)).data
}

export async function submitFeedback(id: string, payload: Omit<Feedback, 'createdAt'>) {
  return (await api.post<{ incident: Incident; memoryUpdated: boolean }>(`/incidents/${id}/feedback`, payload)).data
}

export async function recallMemory(query: string) {
  return (await api.post<{ memories: Memory[]; count: number }>('/memory/recall', { query })).data
}
