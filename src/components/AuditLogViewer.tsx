import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { auditLogApi, AuditLog, AuditLogFilters } from '../config/auditLogApi';

interface AuditLogViewerProps {
  table_name?: string;
  record_id?: string;
  maxHeight?: string;
  showFilters?: boolean;
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ 
  table_name, 
  record_id, 
  maxHeight = '400px',
  showFilters = true
}) => {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters>({
    table_name,
    record_id,
    limit: 100
  });

  useEffect(() => {
    loadAuditLogs();
  }, [filters]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      let auditLogs: AuditLog[];

      if (table_name && record_id) {
        auditLogs = await auditLogApi.getAuditLogsForRecord(table_name, record_id);
      } else {
        auditLogs = await auditLogApi.getAuditLogs(filters);
      }

      setLogs(auditLogs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getReadableFieldName = (fieldName: string) => {
    const fieldMappings: Record<string, string> = {
      'company_group_print_name': 'Company Name',
      'legal_name': 'Legal Name',
      'other_names': 'Other Names',
      'company_group_data_type': 'Company Type',
      'parent_id': 'Parent Company',
      'living_status': 'Status',
      'ownership_type': 'Ownership Type',
      'global_operations': 'Operations Scope',
      'founding_year': 'Founded Year',
      'established_day': 'Established Day',
      'established_month': 'Established Month',
      'company_size': 'Company Size',
      'ntn_no': 'NTN Number',
      'websites': 'Websites',
      'selected_industries': 'Industries',
      'business_operations': 'Business Operations',
      'imports': 'Imports',
      'exports': 'Exports',
      'manufacture': 'Manufacturing',
      'distribution': 'Distribution',
      'wholesale': 'Wholesale',
      'retail': 'Retail',
      'services': 'Services',
      'online': 'Online Operations',
      'soft_products': 'Software Products',
      'company_brand_image': 'Brand Image Rating',
      'company_business_volume': 'Business Volume Rating',
      'company_financials': 'Financial Rating',
      'iisol_relationship': 'IISOL Relationship Rating',
      'industry_name': 'Industry Name',
      'category': 'Category'
    };
    return fieldMappings[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getCleanValue = (value: string | null) => {
    if (value === null || value === undefined || value === 'null' || value === 'None') return 'Not Set';
    if (value === '') return 'Empty';
    
    // Handle boolean values
    if (value === 'Y') return 'Yes';
    if (value === 'N') return 'No';
    if (value === 'true') return 'Yes';
    if (value === 'false') return 'No';
    
    // Handle JSON arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) return 'None';
          return parsed.join(', ');
        }
      } catch (e) {
        // If parsing fails, return as is
      }
    }
    
    // Truncate very long values
    if (value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    
    return value;
  };

  const formatLogEntry = (log: AuditLog) => {
    const fieldName = getReadableFieldName(log.field_name);
    
    if (log.action_type === 'CREATE') {
      const value = getCleanValue(log.new_value);
      return `${fieldName} "${value}" created`;
    } else if (log.action_type === 'UPDATE') {
      const oldValue = getCleanValue(log.old_value);
      const newValue = getCleanValue(log.new_value);
      return `${fieldName} changed from "${oldValue}" to "${newValue}"`;
    } else if (log.action_type === 'DELETE') {
      const value = getCleanValue(log.old_value);
      return `${fieldName} "${value}" deleted`;
    }
    return 'Unknown action';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return '➕';
      case 'UPDATE': return '✏️';
      case 'DELETE': return '❌';
      default: return '📝';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return theme === 'dark' ? 'text-green-400' : 'text-green-600';
      case 'UPDATE': return theme === 'dark' ? 'text-blue-400' : 'text-blue-600';
      case 'DELETE': return theme === 'dark' ? 'text-red-400' : 'text-red-600';
      default: return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg border ${
        theme === 'dark' ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-600'
      }`}>
        <p>Error: {error}</p>
        <button 
          onClick={loadAuditLogs}
          className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
            Activity Log ({logs.length})
          </h3>
          {!table_name && (
            <button 
              onClick={loadAuditLogs}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                theme === 'dark' 
                  ? 'border border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Refresh
            </button>
          )}
        </div>

        {/* Filters */}
        {showFilters && !table_name && (
          <div className="mt-3 flex gap-2">
            <select
              value={filters.table_name || ''}
              onChange={(e) => setFilters(prev => ({...prev, table_name: e.target.value || undefined}))}
              className={`px-2 py-1 rounded border text-xs ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
              }`}
            >
              <option value="">All Tables</option>
              <option value="companies">Companies</option>
              <option value="industries">Industries</option>
              <option value="groups">Groups</option>
              <option value="divisions">Divisions</option>
            </select>

            <select
              value={filters.action_type || ''}
              onChange={(e) => setFilters(prev => ({...prev, action_type: e.target.value || undefined}))}
              className={`px-2 py-1 rounded border text-xs ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
              }`}
            >
              <option value="">All Actions</option>
              <option value="CREATE">Created</option>
              <option value="UPDATE">Changed</option>
              <option value="DELETE">Deleted</option>
            </select>
          </div>
        )}
      </div>

      {/* Activity List */}
      <div 
        className={`overflow-y-auto ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
        style={{ maxHeight }}
      >
        {logs.length === 0 ? (
          <div className={`p-6 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="text-2xl mb-1">📝</div>
            <p className="text-sm">No activity recorded</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {logs.map((log) => (
              <div key={log.id} className={`px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${getActionColor(log.action_type)}`}>
                    {getActionIcon(log.action_type)}
                  </span>
                  <span className={`text-sm flex-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                    {formatLogEntry(log)}
                  </span>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {formatTimestamp(log.timestamp)}
                  </span>
                  {!table_name && (
                    <span className={`text-xs px-1 py-0.5 rounded ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                    }`}>
                      #{log.record_id}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogViewer;