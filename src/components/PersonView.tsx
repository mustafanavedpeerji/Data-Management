import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/apiClient';
import AuditLogViewer from './AuditLogViewer';

interface PersonData {
  record_id?: number;
  person_print_name: string;
  full_name: string;
  gender: 'Male' | 'Female';
  living_status: 'Active' | 'Dead' | 'Missing';
  professional_status?: string;
  religion?: string;
  community?: string;
  base_city?: string;
  attached_companies?: number[];
  department?: string;
  designation?: string;
  date_of_birth?: string;
  age_bracket?: string;
  nic?: string;
}

interface Company {
  record_id: number;
  company_group_print_name: string;
  uid?: string;
}

interface PersonViewProps {
  personId?: string;
  personData?: PersonData;
  onEdit?: () => void;
  onBack?: () => void;
}

const PersonView: React.FC<PersonViewProps> = ({ 
  personId, 
  personData, 
  onEdit, 
  onBack 
}) => {
  const { theme } = useTheme();
  const [person, setPerson] = useState<PersonData | null>(personData || null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(!personData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
    if (personId && !personData) {
      loadPersonData();
    }
  }, [personId, personData]);

  const loadCompanies = async () => {
    try {
      const response = await apiClient.get('/companies/');
      if (response.ok) {
        const data = await response.json();
        const actualCompanies = data.filter((item: any) => 
          item.company_group_data_type === 'Company'
        );
        setCompanies(actualCompanies);
      } else {
        console.error('Failed to load companies:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const loadPersonData = async () => {
    if (!personId) return;
    
    setLoading(true);
    try {
      console.log('Loading person data for ID:', personId);
      
      const response = await apiClient.get(`/persons/${personId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Person data loaded:', data);
        setPerson(data);
        setError('');
      } else {
        const errorText = await response.text();
        console.error('Failed to load person:', response.status, response.statusText, errorText);
        setError(`Failed to load person: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setError('Failed to load person data');
      console.error('Failed to load person:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompanyName = (companyId: number): string => {
    const company = companies.find(c => c.record_id === companyId);
    return company?.company_group_print_name || `Company ${companyId}`;
  };

  const getCompanyUID = (companyId: number): string | undefined => {
    const company = companies.find(c => c.record_id === companyId);
    return company?.uid;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading person data...</p>
          <p className="mt-1 text-xs text-gray-500">Person ID: {personId}</p>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-lg mb-2">⚠️</div>
        <h3 className="text-lg font-medium mb-2">Error Loading Person</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Person data not found'}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'dead':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'missing':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getGenderColor = (gender: string) => {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'female':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  try {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-4xl mx-auto p-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-6">
            {onBack && (
              <button
                onClick={onBack}
                className={`text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ← Back to List
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
              >
                Edit Person
              </button>
            )}
          </div>

          {/* Person Details */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            {/* Person Header */}
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${
                  person.gender === 'Male' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
                }`}>
                  {person.person_print_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {person.person_print_name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded ${getGenderColor(person.gender)}`}>
                      {person.gender}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(person.living_status)}`}>
                      {person.living_status}
                    </span>
                    {person.age_bracket && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}>
                        Age: {person.age_bracket}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Details Table */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Basic Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      {person.full_name && person.full_name !== person.person_print_name && (
                        <div>
                          <dt className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Full Name</dt>
                          <dd className={`text-sm mt-1 ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{person.full_name}</dd>
                        </div>
                      )}
                      {person.nic && (
                        <div>
                          <dt className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>NIC</dt>
                          <dd className={`text-sm mt-1 font-mono ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{person.nic}</dd>
                        </div>
                      )}
                      {person.date_of_birth && (
                        <div>
                          <dt className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Date of Birth</dt>
                          <dd className={`text-sm mt-1 ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{new Date(person.date_of_birth).toLocaleDateString()}</dd>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {person.religion && (
                        <div>
                          <dt className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Religion</dt>
                          <dd className={`text-sm mt-1 ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{person.religion}</dd>
                        </div>
                      )}
                      {person.community && (
                        <div>
                          <dt className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Community</dt>
                          <dd className={`text-sm mt-1 ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{person.community}</dd>
                        </div>
                      )}
                      {person.base_city && (
                        <div>
                          <dt className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Base City</dt>
                          <dd className={`text-sm mt-1 ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{person.base_city}</dd>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                {(person.designation || person.department || person.professional_status) && (
                  <div>
                    <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Professional Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        {person.designation && (
                          <div>
                            <dt className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>Designation</dt>
                            <dd className={`text-sm mt-1 ${
                              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                            }`}>{person.designation}</dd>
                          </div>
                        )}
                        {person.department && (
                          <div>
                            <dt className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>Department</dt>
                            <dd className={`text-sm mt-1 ${
                              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                            }`}>{person.department}</dd>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {person.professional_status && (
                          <div>
                            <dt className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>Professional Status</dt>
                            <dd className={`text-sm mt-1 ${
                              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                            }`}>{person.professional_status}</dd>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Attached Companies */}
                {person.attached_companies && person.attached_companies.length > 0 && (
                  <div>
                    <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Attached Companies ({person.attached_companies.length})
                    </h2>
                    <div className="space-y-2">
                      {person.attached_companies.map((companyId) => (
                        <div
                          key={companyId}
                          className={`text-sm py-2 px-3 rounded flex items-center gap-2 ${
                            theme === 'dark'
                              ? 'bg-gray-700/50 text-gray-300'
                              : 'bg-gray-50 text-gray-700'
                          }`}
                        >
                          {getCompanyUID(companyId) && (
                            <span className={`px-2 py-0.5 text-xs rounded font-mono font-semibold ${
                              theme === 'dark' ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {getCompanyUID(companyId)}
                            </span>
                          )}
                          <span>{getCompanyName(companyId)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Trail */}
                <div>
                  <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Activity History
                  </h2>
                  <AuditLogViewer 
                    table_name="persons" 
                    record_id={personId} 
                    maxHeight="300px"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (renderError) {
    console.error('PersonView render error:', renderError);
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-lg mb-2">⚠️</div>
        <h3 className="text-lg font-medium mb-2">Rendering Error</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          An error occurred while displaying person information
        </p>
        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded mb-4 text-left max-w-md mx-auto overflow-auto">
          {renderError instanceof Error ? renderError.message : 'Unknown error'}
        </pre>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }
};

export default PersonView;