const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

class ApiService {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth
  async register(data: { email: string; password: string; name?: string; teamName?: string }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Users
  async getCurrentUser() {
    return this.request('/users/me');
  }

  async updateUser(data: { name?: string; avatarUrl?: string }) {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Clients
  async getClients(params?: { search?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', params.limit.toString());
    return this.request(`/clients?${query}`);
  }

  async createClient(data: any) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getClient(id: string) {
    return this.request(`/clients/${id}`);
  }

  async updateClient(id: string, data: any) {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string) {
    return this.request(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Projects
  async getProjects(params?: { status?: string; clientId?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.clientId) query.append('clientId', params.clientId);
    return this.request(`/projects?${query}`);
  }

  async createProject(data: any) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProject(id: string) {
    return this.request(`/projects/${id}`);
  }

  async updateProject(id: string, data: any) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Tasks
  async getTasks(params?: { priority?: number; due?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.priority) query.append('priority', params.priority.toString());
    if (params?.due) query.append('due', params.due);
    if (params?.status) query.append('status', params.status);
    return this.request(`/tasks?${query}`);
  }

  async createTask(projectId: string, data: any) {
    return this.request(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: any) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getRevenue(period: string = 'month') {
    return this.request(`/analytics/revenue?period=${period}`);
  }

  async runAnalysis(data: { period: string }) {
    return this.request('/analytics/run-analysis', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Inbox
  async getMessages(unread?: boolean) {
    const query = unread ? '?unread=true' : '';
    return this.request(`/inbox${query}`);
  }

  async sendMessage(data: { content: string; clientId?: string; projectId?: string }) {
    return this.request('/inbox/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markMessageAsRead(id: string) {
    return this.request(`/inbox/messages/${id}/read`, {
      method: 'PUT',
    });
  }

  // Notifications
  async getNotifications(params?: { unread?: boolean; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.unread) query.append('unread', 'true');
    if (params?.limit) query.append('limit', params.limit.toString());
    return this.request(`/notifications?${query}`);
  }

  async markNotificationAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  async deleteNotification(id: string) {
    return this.request(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  // Invoices
  async getProjectInvoices(projectId: string) {
    return this.request(`/invoices/project/${projectId}`);
  }

  async createInvoice(data: { projectId: string; amount: number; status?: string; dueDate?: string; paidDate?: string; fileUrl?: string }) {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: string, data: { amount?: number; status?: string; dueDate?: string; paidDate?: string; fileUrl?: string }) {
    return this.request(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: string) {
    return this.request(`/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  // Attachments
  async uploadAttachment(projectId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/attachments`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async getProjectAttachments(projectId: string) {
    return this.request(`/projects/${projectId}/attachments`);
  }

  async deleteAttachment(id: string) {
    return this.request(`/attachments/${id}`, {
      method: 'DELETE',
    });
  }

  getAttachmentViewUrl(id: string) {
    return `${API_BASE_URL}/attachments/${id}/view`;
  }

  getAttachmentDownloadUrl(id: string) {
    return `${API_BASE_URL}/attachments/${id}/download`;
  }
}

export default new ApiService();
