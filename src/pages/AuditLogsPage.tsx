import React from 'react';
import PageMeta from '../components/common/PageMeta';
import AuditLogViewer from '../components/AuditLogViewer';
import { useTheme } from '../context/ThemeContext';

const AuditLogsPage: React.FC = () => {
  const { theme } = useTheme();

  return (
    <>
      <PageMeta title="Audit Logs" />
      
      <div className="space-y-6">
        {/* Page Header */}
        <div className={`rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                📋 Audit Logs
              </h1>
              <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Track all data changes and user activities across the system
              </p>
            </div>
            
            <div className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
              <div className="text-sm font-medium">System Monitoring</div>
              <div className="text-xs opacity-75">Real-time activity tracking</div>
            </div>
          </div>
        </div>

        {/* Audit Log Viewer */}
        <AuditLogViewer maxHeight="75vh" />
      </div>
    </>
  );
};

export default AuditLogsPage;