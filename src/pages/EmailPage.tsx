import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import apiClient from '../config/apiClient';

interface Email {
  email_id: number;
  email_address: string;
  email_type?: string;
  description?: string;
  is_active: string;
  created_at: string;
  updated_at?: string;
}

interface EmailWithAssociations extends Email {
  associations: Array<{
    association_id: number;
    company_id?: number;
    department?: string;
    person_id?: number;
    association_type?: string;
    notes?: string;
  }>;
}

const EmailPage: React.FC = () => {
  const { theme } = useTheme();
  const { navigateWithConfirm } = useNavigation();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailWithAssociations | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load emails
  const loadEmails = async (search: string = '') => {
    setLoading(true);
    try {
      const endpoint = search 
        ? `/emails/search?q=${encodeURIComponent(search)}`
        : '/emails/all';
      const response = await apiClient.get(endpoint);
      setEmails(response.data);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load email details
  const loadEmailDetails = async (emailId: number) => {
    try {
      const response = await apiClient.get(`/emails/${emailId}`);
      setSelectedEmail(response.data);
      setShowDetails(true);
    } catch (error) {
      console.error('Error loading email details:', error);
    }
  };

  // Delete email
  const deleteEmail = async (emailId: number) => {
    if (window.confirm('Are you sure you want to delete this email? This will also delete all its associations.')) {
      try {
        await apiClient.delete(`/emails/${emailId}`);
        loadEmails(searchTerm);
        if (selectedEmail?.email_id === emailId) {
          setShowDetails(false);
          setSelectedEmail(null);
        }
      } catch (error) {
        console.error('Error deleting email:', error);
        alert('Error deleting email');
      }
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadEmails(searchTerm);
  };

  // Initial load
  useEffect(() => {
    loadEmails();
  }, []);

  // Get email type badge color
  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'business': return 'bg-blue-100 text-blue-800';
      case 'personal': return 'bg-green-100 text-green-800';
      case 'support': return 'bg-orange-100 text-orange-800';
      case 'sales': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-boxdark text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Email Management</h1>
          <button
            onClick={() => navigateWithConfirm('/emails/add')}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Add Email
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className={`lg:col-span-2 ${theme === 'dark' ? 'bg-boxdark-2' : 'bg-white'} rounded-lg shadow-sm p-6`}>
            {/* Search */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-md ${
                    theme === 'dark'
                      ? 'bg-boxdark border-strokedark text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Email List */}
            {loading ? (
              <div className="text-center py-8">Loading emails...</div>
            ) : emails.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No emails found</div>
            ) : (
              <div className="space-y-3">
                {emails.map((email) => (
                  <div
                    key={email.email_id}
                    className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
                      theme === 'dark'
                        ? 'border-strokedark hover:bg-boxdark'
                        : 'border-gray-200 hover:bg-gray-50'
                    } ${
                      selectedEmail?.email_id === email.email_id
                        ? theme === 'dark'
                          ? 'bg-boxdark border-primary'
                          : 'bg-blue-50 border-primary'
                        : ''
                    }`}
                    onClick={() => loadEmailDetails(email.email_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{email.email_address}</span>
                          {email.email_type && (
                            <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(email.email_type)}`}>
                              {email.email_type}
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            email.is_active === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {email.is_active}
                          </span>
                        </div>
                        {email.description && (
                          <p className="text-sm text-gray-600 truncate">{email.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(email.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateWithConfirm(`/emails/edit/${email.email_id}`);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEmail(email.email_id);
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Details Sidebar */}
          <div className={`${theme === 'dark' ? 'bg-boxdark-2' : 'bg-white'} rounded-lg shadow-sm p-6`}>
            {showDetails && selectedEmail ? (
              <div>
                <h3 className="text-lg font-semibold mb-4">Email Details</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
                    <p className="font-medium">{selectedEmail.email_address}</p>
                  </div>
                  
                  {selectedEmail.email_type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
                      <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(selectedEmail.email_type)}`}>
                        {selectedEmail.email_type}
                      </span>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedEmail.is_active === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedEmail.is_active}
                    </span>
                  </div>
                  
                  {selectedEmail.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                      <p className="text-sm">{selectedEmail.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Created</label>
                    <p className="text-sm">{new Date(selectedEmail.created_at).toLocaleString()}</p>
                  </div>
                  
                  {selectedEmail.updated_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Updated</label>
                      <p className="text-sm">{new Date(selectedEmail.updated_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Associations */}
                {selectedEmail.associations && selectedEmail.associations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Associations ({selectedEmail.associations.length})</h4>
                    <div className="space-y-2">
                      {selectedEmail.associations.map((assoc, index) => (
                        <div
                          key={assoc.association_id}
                          className={`p-3 rounded-md border ${
                            theme === 'dark' ? 'border-strokedark bg-boxdark' : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          {assoc.company_id && (
                            <div className="text-sm">
                              <span className="font-medium">Company ID:</span> {assoc.company_id}
                            </div>
                          )}
                          {assoc.person_id && (
                            <div className="text-sm">
                              <span className="font-medium">Person ID:</span> {assoc.person_id}
                            </div>
                          )}
                          {assoc.department && (
                            <div className="text-sm">
                              <span className="font-medium">Department:</span> {assoc.department}
                            </div>
                          )}
                          {assoc.association_type && (
                            <div className="text-sm">
                              <span className="font-medium">Type:</span> {assoc.association_type}
                            </div>
                          )}
                          {assoc.notes && (
                            <div className="text-sm">
                              <span className="font-medium">Notes:</span> {assoc.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select an email to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailPage;