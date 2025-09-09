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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [companies, setCompanies] = useState<{[key: number]: string}>({});
  const [persons, setPersons] = useState<{[key: number]: string}>({});

  // Load emails
  const loadEmails = async (search: string = '') => {
    setLoading(true);
    try {
      const endpoint = search 
        ? `/emails/search?q=${encodeURIComponent(search)}`
        : '/emails/all';
      const response = await apiClient.get(endpoint);
      if (response.ok) {
        const responseData = await response.json();
        setEmails(responseData);
      }
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load companies and persons for name lookup
  const loadNamesData = async () => {
    try {
      // Load companies
      const companiesResponse = await apiClient.get('/companies/all');
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json();
        const companiesMap = companiesData.reduce((acc: {[key: number]: string}, company: any) => {
          acc[company.record_id] = company.company_group_print_name;
          return acc;
        }, {});
        setCompanies(companiesMap);
      }

      // Load persons
      const personsResponse = await apiClient.get('/persons/all');
      if (personsResponse.ok) {
        const personsData = await personsResponse.json();
        const personsMap = personsData.reduce((acc: {[key: number]: string}, person: any) => {
          acc[person.record_id] = person.person_print_name;
          return acc;
        }, {});
        setPersons(personsMap);
      }
    } catch (error) {
      console.error('Error loading names data:', error);
    }
  };

  // Load email details
  const loadEmailDetails = async (emailId: number) => {
    try {
      const response = await apiClient.get(`/emails/${emailId}`);
      if (response.ok) {
        const responseData = await response.json();
        setSelectedEmail(responseData);
      }
      setShowDetailsModal(true);
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
          setShowDetailsModal(false);
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
    loadNamesData();
  }, []);

  // Group associations by company for better display
  const groupAssociations = (associations: any[]) => {
    const companyGroups: { [key: string]: any[] } = {};
    const personAssociations: any[] = [];
    
    associations.forEach((assoc) => {
      if (assoc.person_id) {
        // Person associations go separate
        personAssociations.push(assoc);
      } else if (assoc.company_id) {
        // Group by company
        const key = assoc.company_id.toString();
        if (!companyGroups[key]) {
          companyGroups[key] = [];
        }
        companyGroups[key].push(assoc);
      } else if (assoc.department) {
        // Department only (unknown company)
        const key = 'unknown_company';
        if (!companyGroups[key]) {
          companyGroups[key] = [];
        }
        companyGroups[key].push(assoc);
      }
    });
    
    return { companyGroups, personAssociations };
  };

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

        {/* Email List */}
        <div className={`${theme === 'dark' ? 'bg-boxdark-2' : 'bg-white'} rounded-lg shadow-sm p-6`}>
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
                    className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all ${
                      theme === 'dark'
                        ? 'border-strokedark hover:bg-boxdark hover:border-primary'
                        : 'border-gray-200 hover:bg-gray-50 hover:border-primary'
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
      </div>

      {/* Email Details Modal */}
      {showDetailsModal && selectedEmail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${theme === 'dark' ? 'bg-boxdark-2 border-strokedark' : 'bg-white border-gray-200'} border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col animate-in slide-in-from-bottom-4 duration-300`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="text-xl font-semibold">Email Details</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateWithConfirm(`/emails/edit/${selectedEmail.email_id}`)}
                  className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-blue-600 dark:text-blue-400">Basic Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Email Address</label>
                    <p className="font-medium text-lg">{selectedEmail.email_address}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      selectedEmail.is_active === 'Active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {selectedEmail.is_active}
                    </span>
                  </div>

                  {selectedEmail.email_type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                      <span className={`px-3 py-1 text-sm rounded-full ${getTypeColor(selectedEmail.email_type)}`}>
                        {selectedEmail.email_type}
                      </span>
                    </div>
                  )}
                  
                  {selectedEmail.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                      <p className="text-sm">{selectedEmail.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Created</label>
                      <p className="text-sm">{new Date(selectedEmail.created_at).toLocaleString()}</p>
                    </div>
                    
                    {selectedEmail.updated_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Updated</label>
                        <p className="text-sm">{new Date(selectedEmail.updated_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Associations */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-purple-600 dark:text-purple-400">
                    Associations ({selectedEmail.associations?.length || 0})
                  </h4>
                  
                  {selectedEmail.associations && selectedEmail.associations.length > 0 ? (
                    (() => {
                      const { companyGroups, personAssociations } = groupAssociations(selectedEmail.associations);
                      const hasCompanyAssociations = Object.keys(companyGroups).length > 0;
                      const hasPersonAssociations = personAssociations.length > 0;

                      return (
                        <div className="space-y-4">
                          {/* Company & Departments */}
                          {hasCompanyAssociations && (
                            <div>
                              <h5 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 border-b border-blue-200 dark:border-blue-700 pb-1">
                                🏢 Companies & Departments
                              </h5>
                              <div className="space-y-2">
                                {Object.entries(companyGroups).map(([companyKey, groupAssocs]) => {
                                  const isUnknownCompany = companyKey === 'unknown_company';
                                  const companyName = isUnknownCompany 
                                    ? 'Unknown Company' 
                                    : companies[parseInt(companyKey)] || `Company ${companyKey}`;
                                  
                                  // Separate company-only vs company+department associations
                                  const companyOnlyAssocs = groupAssocs.filter(a => !a.department);
                                  const deptAssocs = groupAssocs.filter(a => a.department);
                                  
                                  return (
                                    <div
                                      key={companyKey}
                                      className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50 border-blue-200'}`}
                                    >
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        <span className="font-medium text-blue-700 dark:text-blue-300">
                                          {companyName}
                                        </span>
                                      </div>
                                      
                                      {/* Company-only associations */}
                                      {companyOnlyAssocs.length > 0 && (
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                          📋 General company association (no specific department)
                                        </div>
                                      )}
                                      
                                      {/* Department associations */}
                                      {deptAssocs.length > 0 && (
                                        <div className="space-y-1">
                                          <div className="text-xs text-gray-600 dark:text-gray-400">Departments:</div>
                                          <div className="flex flex-wrap gap-1">
                                            {deptAssocs.map((assoc, idx) => (
                                              <span
                                                key={idx}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'}`}
                                              >
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                {assoc.department}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Persons */}
                          {hasPersonAssociations && (
                            <div>
                              <h5 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 border-b border-purple-200 dark:border-purple-700 pb-1">
                                👤 Persons
                              </h5>
                              <div className="space-y-2">
                                {personAssociations.map((assoc, index) => (
                                  <div
                                    key={index}
                                    className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-purple-50 border-purple-200'}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                      <span className="font-medium text-purple-700 dark:text-purple-300">
                                        {persons[assoc.person_id] || `Person ${assoc.person_id}`}
                                      </span>
                                    </div>
                                    {assoc.notes && (
                                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                        Note: {assoc.notes}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                      <div className="text-sm">No associations found</div>
                      <div className="text-xs mt-1">This email is not associated with any companies or persons</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="text-sm text-gray-500">
                Email ID: {selectedEmail.email_id}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    deleteEmail(selectedEmail.email_id);
                  }}
                  className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className={`px-4 py-1 text-sm rounded-md transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailPage;