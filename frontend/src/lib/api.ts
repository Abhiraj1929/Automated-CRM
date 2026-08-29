// ============================================================
// API Client - Business CRM API
// ============================================================
import { apiClient } from "./auth";
export { apiClient };

// ============================================================
// Accounts
// ============================================================
export async function getAccounts(params?: { industry?: string; search?: string; page?: number; limit?: number }) {
  const response = await apiClient.get("/accounts", { params });
  return response.data;
}
export async function getAccount(id: string) {
  const response = await apiClient.get(`/accounts/${id}`);
  return response.data;
}
export async function createAccount(data: Record<string, unknown>) {
  const response = await apiClient.post("/accounts", data);
  return response.data;
}
export async function updateAccount(id: string, data: Record<string, unknown>) {
  const response = await apiClient.put(`/accounts/${id}`, data);
  return response.data;
}
export async function deleteAccount(id: string) {
  const response = await apiClient.delete(`/accounts/${id}`);
  return response.data;
}

// ============================================================
// Contacts
// ============================================================
export async function getContacts(params?: { account_id?: string; search?: string; page?: number; limit?: number }) {
  const response = await apiClient.get("/contacts", { params });
  return response.data;
}
export async function getContact(id: string) {
  const response = await apiClient.get(`/contacts/${id}`);
  return response.data;
}
export async function createContact(data: Record<string, unknown>) {
  const response = await apiClient.post("/contacts", data);
  return response.data;
}
export async function updateContact(id: string, data: Record<string, unknown>) {
  const response = await apiClient.put(`/contacts/${id}`, data);
  return response.data;
}
export async function deleteContact(id: string) {
  const response = await apiClient.delete(`/contacts/${id}`);
  return response.data;
}

// ============================================================
// Leads
// ============================================================
export async function getLeads(params?: { status?: string; search?: string; page?: number; limit?: number }) {
  const response = await apiClient.get("/leads", { params });
  return response.data;
}
export async function getLead(id: string) {
  const response = await apiClient.get(`/leads/${id}`);
  return response.data;
}
export async function createLead(data: Record<string, unknown>) {
  const response = await apiClient.post("/leads", data);
  return response.data;
}
export async function updateLead(id: string, data: Record<string, unknown>) {
  const response = await apiClient.put(`/leads/${id}`, data);
  return response.data;
}
export async function updateLeadStatus(id: string, status: string) {
  const response = await apiClient.patch(`/leads/${id}/status`, { status });
  return response.data;
}
export async function convertLead(id: string, data: Record<string, unknown>) {
  const response = await apiClient.post(`/leads/${id}/convert`, data);
  return response.data;
}
export async function deleteLead(id: string) {
  const response = await apiClient.delete(`/leads/${id}`);
  return response.data;
}

// ============================================================
// Opportunities
// ============================================================
export async function getOpportunities(params?: { stage?: string; account_id?: string; search?: string; page?: number; limit?: number }) {
  const response = await apiClient.get("/opportunities", { params });
  return response.data;
}
export async function getOpportunity(id: string) {
  const response = await apiClient.get(`/opportunities/${id}`);
  return response.data;
}
export async function createOpportunity(data: Record<string, unknown>) {
  const response = await apiClient.post("/opportunities", data);
  return response.data;
}
export async function updateOpportunity(id: string, data: Record<string, unknown>) {
  const response = await apiClient.put(`/opportunities/${id}`, data);
  return response.data;
}
export async function updateOpportunityStage(id: string, stage: string) {
  const response = await apiClient.patch(`/opportunities/${id}/stage`, { stage });
  return response.data;
}
export async function deleteOpportunity(id: string) {
  const response = await apiClient.delete(`/opportunities/${id}`);
  return response.data;
}
export async function getPipelineStats() {
  const response = await apiClient.get("/opportunities/stats");
  return response.data;
}

// ============================================================
// Activities
// ============================================================
export async function getActivities(params?: { type?: string; status?: string; what_id?: string; what_type?: string; page?: number; limit?: number }) {
  const response = await apiClient.get("/activities", { params });
  return response.data;
}
export async function getActivity(id: string) {
  const response = await apiClient.get(`/activities/${id}`);
  return response.data;
}
export async function createActivity(data: Record<string, unknown>) {
  const response = await apiClient.post("/activities", data);
  return response.data;
}
export async function updateActivity(id: string, data: Record<string, unknown>) {
  const response = await apiClient.put(`/activities/${id}`, data);
  return response.data;
}
export async function deleteActivity(id: string) {
  const response = await apiClient.delete(`/activities/${id}`);
  return response.data;
}
export async function getMyTasks() {
  const response = await apiClient.get("/activities/my-tasks");
  return response.data;
}

// ============================================================
// Users
// ============================================================
export async function getUsers(params?: { role?: string; status?: string; page?: number; limit?: number }) {
  const response = await apiClient.get("/users", { params });
  return response.data;
}

// ============================================================
// Dashboard
// ============================================================
export async function getDashboardStats() {
  const response = await apiClient.get("/dashboard/stats");
  return response.data;
}

// ============================================================
// Products
// ============================================================
export async function getProducts(params?: { search?: string; is_active?: string }) {
  const response = await apiClient.get("/products", { params });
  return response.data;
}
export async function getProduct(id: string) {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
}
export async function createProduct(data: Record<string, unknown>) {
  const response = await apiClient.post("/products", data);
  return response.data;
}
export async function updateProduct(id: string, data: Record<string, unknown>) {
  const response = await apiClient.put(`/products/${id}`, data);
  return response.data;
}
export async function deleteProduct(id: string) {
  const response = await apiClient.delete(`/products/${id}`);
  return response.data;
}
export async function getProductStats() {
  const response = await apiClient.get("/products/stats");
  return response.data;
}

// ============================================================
// Campaigns
// ============================================================
export async function getCampaigns(params?: { status?: string; search?: string; type?: string }) {
  const response = await apiClient.get("/campaigns", { params });
  return response.data;
}
export async function getCampaign(id: string) {
  const response = await apiClient.get(`/campaigns/${id}`);
  return response.data;
}
export async function createCampaign(data: Record<string, unknown>) {
  const response = await apiClient.post("/campaigns", data);
  return response.data;
}
export async function updateCampaign(id: string, data: Record<string, unknown>) {
  const response = await apiClient.put(`/campaigns/${id}`, data);
  return response.data;
}
export async function deleteCampaign(id: string) {
  const response = await apiClient.delete(`/campaigns/${id}`);
  return response.data;
}
export async function getCampaignLeads(id: string, params?: { status?: string; search?: string; page?: number; limit?: number }) {
  const response = await apiClient.get(`/campaigns/${id}/leads`, { params });
  return response.data;
}
export async function linkLeadsToCampaign(id: string, leadIds: string[]) {
  const response = await apiClient.post(`/campaigns/${id}/leads`, { lead_ids: leadIds });
  return response.data;
}
export async function unlinkLeadFromCampaign(id: string, leadId: string) {
  const response = await apiClient.delete(`/campaigns/${id}/leads/${leadId}`);
  return response.data;
}
export async function logCampaignResponse(id: string, data: { lead_id?: string; contact_id?: string; response_type: string; channel?: string }) {
  const response = await apiClient.post(`/campaigns/${id}/responses`, data);
  return response.data;
}

// ============================================================
// Automation
// ============================================================
export async function getAuditLogs(params?: { entity_type?: string; entity_id?: string; user_id?: string; page?: number; limit?: number }) {
  const response = await apiClient.get("/automation/audit-logs", { params });
  return response.data;
}
export async function getWorkflowRules(params?: { entity_type?: string }) {
  const response = await apiClient.get("/automation/workflows", { params });
  return response.data;
}
export async function createWorkflowRule(data: Record<string, unknown>) {
  const response = await apiClient.post("/automation/workflows", data);
  return response.data;
}
export async function updateWorkflowRule(id: string, data: Record<string, unknown>) {
  const response = await apiClient.put(`/automation/workflows/${id}`, data);
  return response.data;
}
export async function deleteWorkflowRule(id: string) {
  const response = await apiClient.delete(`/automation/workflows/${id}`);
  return response.data;
}
export async function getWorkflowLogs(params?: { rule_id?: string; entity_type?: string }) {
  const response = await apiClient.get("/automation/workflows/logs", { params });
  return response.data;
}
export async function getScoringRules() {
  const response = await apiClient.get("/automation/scoring-rules");
  return response.data;
}
export async function createScoringRule(data: Record<string, unknown>) {
  const response = await apiClient.post("/automation/scoring-rules", data);
  return response.data;
}
export async function updateScoringRule(id: string, data: Record<string, unknown>) {
  const response = await apiClient.put(`/automation/scoring-rules/${id}`, data);
  return response.data;
}
export async function deleteScoringRule(id: string) {
  const response = await apiClient.delete(`/automation/scoring-rules/${id}`);
  return response.data;
}
export async function rescoreAllLeads() {
  const response = await apiClient.post("/automation/scoring-rules/rescore");
  return response.data;
}
export async function getEscalationRules() {
  const response = await apiClient.get("/automation/escalation-rules");
  return response.data;
}
export async function createEscalationRule(data: Record<string, unknown>) {
  const response = await apiClient.post("/automation/escalation-rules", data);
  return response.data;
}
export async function updateEscalationRule(id: string, data: Record<string, unknown>) {
  const response = await apiClient.put(`/automation/escalation-rules/${id}`, data);
  return response.data;
}
export async function deleteEscalationRule(id: string) {
  const response = await apiClient.delete(`/automation/escalation-rules/${id}`);
  return response.data;
}
export async function runEscalationsNow() {
  const response = await apiClient.post("/automation/escalation-rules/run");
  return response.data;
}
export async function getEmailTemplates(params?: { category?: string }) {
  const response = await apiClient.get("/automation/email-templates", { params });
  return response.data;
}
export async function createEmailTemplate(data: Record<string, unknown>) {
  const response = await apiClient.post("/automation/email-templates", data);
  return response.data;
}
export async function updateEmailTemplate(id: string, data: Record<string, unknown>) {
  const response = await apiClient.put(`/automation/email-templates/${id}`, data);
  return response.data;
}
export async function deleteEmailTemplate(id: string) {
  const response = await apiClient.delete(`/automation/email-templates/${id}`);
  return response.data;
}
export async function sendEmail(data: Record<string, unknown>) {
  const response = await apiClient.post("/automation/emails/send", data);
  return response.data;
}
export async function getEmailLogs(params?: { entity_type?: string; entity_id?: string }) {
  const response = await apiClient.get("/automation/emails/logs", { params });
  return response.data;
}
export async function checkDuplicates(data: { entity_type: string; email?: string; first_name?: string; last_name?: string; company?: string; account_id?: string; name?: string }) {
  const response = await apiClient.post("/automation/check-duplicates", data);
  return response.data;
}
export async function uploadAttachment(file: File, entityType: string, entityId: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("entity_type", entityType);
  formData.append("entity_id", entityId);
  const response = await apiClient.post("/automation/attachments/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
  return response.data;
}
export async function getAttachments(entityType: string, entityId: string) {
  const response = await apiClient.get("/automation/attachments", { params: { entity_type: entityType, entity_id: entityId } });
  return response.data;
}
export async function deleteAttachment(id: string) {
  const response = await apiClient.delete(`/automation/attachments/${id}`);
  return response.data;
}
export async function getNotifications(params?: { unread_only?: string }) {
  const response = await apiClient.get("/automation/notifications", { params });
  return response.data;
}
export async function getUnreadCount() {
  const response = await apiClient.get("/automation/notifications/unread-count");
  return response.data;
}
export async function markNotificationRead(id: string) {
  const response = await apiClient.put(`/automation/notifications/${id}/read`);
  return response.data;
}
export async function markAllNotificationsRead() {
  const response = await apiClient.put("/automation/notifications/read-all");
  return response.data;
}
export async function getScheduledJobs() {
  const response = await apiClient.get("/automation/scheduled-jobs");
  return response.data;
}
export async function runScheduledJobsNow() {
  const response = await apiClient.post("/automation/scheduled-jobs/run");
  return response.data;
}

// ============================================================
// Import/Export
// ============================================================
export async function exportData(entity: string, format: string = 'csv') {
  const response = await apiClient.get(`/data/export/${entity}`, {
    params: { format },
    responseType: 'blob',
  });
  return response;
}

export async function importData(entity: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post(`/data/import/${entity}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

// ============================================================
// Reports
// ============================================================
export async function getReport(type: string, format: string = 'csv', params: Record<string, string> = {}) {
  const response = await apiClient.get(`/reports/${type}`, {
    params: { format, ...params },
    responseType: 'blob',
  });
  return response;
}

export async function getScheduledReports() {
  const response = await apiClient.get('/reports/scheduled');
  return response.data;
}

export async function createScheduledReport(data: Record<string, unknown>) {
  const response = await apiClient.post('/reports/scheduled', data);
  return response.data;
}

export async function deleteScheduledReport(id: string) {
  const response = await apiClient.delete(`/reports/scheduled/${id}`);
  return response.data;
}
