import apiClient from './apiClient';

export interface AuditLog {
  id: number;
  table_name: string;
  record_id: string;
  field_name: string;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE';
  old_value: string | null;
  new_value: string | null;
  user_id: string | null;
  user_name: string | null;
  timestamp: string;
}

export interface AuditLogFilters {
  table_name?: string;
  record_id?: string;
  action_type?: string;
  field_name?: string;
  user_id?: string;
  skip?: number;
  limit?: number;
}

class AuditLogAPI {
  private baseUrl = '/audit-logs';

  async getAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const url = params.toString() ? `${this.baseUrl}?${params.toString()}` : this.baseUrl;
      const response = await apiClient.get(url);
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to fetch audit logs: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  async getAuditLogsForRecord(table_name: string, record_id: string): Promise<AuditLog[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/record/${table_name}/${record_id}`);
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to fetch audit logs for record: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching audit logs for record:', error);
      throw error;
    }
  }

  async getRecentAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/recent?limit=${limit}`);
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to fetch recent audit logs: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching recent audit logs:', error);
      throw error;
    }
  }
}

export const auditLogApi = new AuditLogAPI();