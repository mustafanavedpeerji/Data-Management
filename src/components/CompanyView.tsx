import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/apiClient';

interface Industry {
  id: number;
  industry_name: string;
  category: string;
  parent_id: number | null;
}

interface CompanyData {
  record_id?: string;
  company_group_data_type: 'Group' | 'Company' | 'Division';
  company_group_print_name: string;
  legal_name: string;
  other_names: string;
  parent_id: string | null;
  living_status: 'Active' | 'Inactive' | 'Dormant' | 'In Process';
  ownership_type: string;
  global_operations: 'Local' | 'National' | 'Multi National';
  founding_year: string;
  established_day: string;
  established_month: string;
  websites: string[];
  company_size: number;
  ntn_no: string;
  operations: {
    imports: boolean;
    exports: boolean;
    manufacture: boolean;
    distribution: boolean;
    wholesale: boolean;
    retail: boolean;
    services: boolean;
    online: boolean;
    soft_products: boolean;
  };
  selected_industries: number[];
  company_brand_image: number | null;
  company_business_volume: number | null;
  company_financials: number | null;
  iisol_relationship: number | null;
  group_name?: string;
}

interface CompanyViewProps {
  companyId?: string;
  companyData?: CompanyData;
  onEdit?: () => void;
  onBack?: () => void;
}

const CompanyView: React.FC<CompanyViewProps> = ({ 
  companyId, 
  companyData, 
  onEdit, 
  onBack 
}) => {
  const { theme } = useTheme();
  const [company, setCompany] = useState<CompanyData | null>(companyData || null);
  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(!companyData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIndustries();
    if (companyId && !companyData) {
      loadCompanyData();
    }
  }, [companyId, companyData]);

  const loadIndustries = async () => {
    try {
      const response = await apiClient.get('/industries/');
      if (response.ok) {
        const data = await response.json();
        setAllIndustries(data);
      }
    } catch (error) {
      console.error('Failed to load industries:', error);
    }
  };

  const loadCompanyData = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      console.log('Loading entity data for ID:', companyId);
      
      // Try all three endpoint types to find the entity data
      let response;
      let data;
      let entityType;
      
      // Define endpoints to try in order
      const endpoints = [
        { url: `/companies/${companyId}`, type: 'Company', listUrl: '/companies/' },
        { url: `/groups/${companyId}`, type: 'Group', listUrl: '/groups/' },
        { url: `/divisions/${companyId}`, type: 'Division', listUrl: '/divisions/' }
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying ${endpoint.type} endpoint: ${endpoint.url}`);
          response = await apiClient.get(endpoint.url);
          if (response.ok) {
            data = await response.json();
            entityType = endpoint.type;
            console.log(`${endpoint.type} data loaded from individual endpoint:`, data);
            break;
          }
        } catch (error) {
          console.log(`${endpoint.type} individual endpoint failed, trying ${endpoint.type} list...`);
          try {
            // If individual endpoint fails, try the list endpoint
            response = await apiClient.get(endpoint.listUrl);
            if (response.ok) {
              const allEntities = await response.json();
              data = allEntities.find((entity: any) => entity.record_id === companyId);
              if (data) {
                entityType = endpoint.type;
                console.log(`${endpoint.type} data found in list:`, data);
                break;
              }
            }
          } catch (listError) {
            console.log(`${endpoint.type} list endpoint also failed:`, listError);
          }
        }
      }
      
      if (data) {
        // Ensure data structure compatibility
        const formattedData = {
          ...data,
          // Ensure entity type is set correctly
          company_group_data_type: data.company_group_data_type || entityType,
          // Convert operations from Y/N to boolean if needed
          operations: data.operations || {
            imports: data.imports === 'Y',
            exports: data.exports === 'Y',
            manufacture: data.manufacture === 'Y',
            distribution: data.distribution === 'Y',
            wholesale: data.wholesale === 'Y',
            retail: data.retail === 'Y',
            services: data.services === 'Y',
            online: data.online === 'Y',
            soft_products: data.soft_products === 'Y',
          },
          // Ensure ratings (can be null if not set)
          company_brand_image: data.company_brand_image || null,
          company_business_volume: data.company_business_volume || null,
          company_financials: data.company_financials || null,
          iisol_relationship: data.iisol_relationship || null,
          // Ensure selected_industries is an array (parse JSON string if needed)
          selected_industries: (() => {
            if (!data.selected_industries) return [];
            if (Array.isArray(data.selected_industries)) return data.selected_industries;
            if (typeof data.selected_industries === 'string') {
              try {
                return JSON.parse(data.selected_industries);
              } catch (e) {
                console.warn('Failed to parse selected_industries:', data.selected_industries);
                return [];
              }
            }
            return [];
          })(),
          // Ensure websites is an array (parse JSON string if needed)
          websites: (() => {
            if (!data.websites) return [];
            if (Array.isArray(data.websites)) return data.websites;
            if (typeof data.websites === 'string') {
              try {
                return JSON.parse(data.websites);
              } catch (e) {
                console.warn('Failed to parse websites:', data.websites);
                return [];
              }
            }
            return [];
          })(),
        };
        
        // If this company/division has a parent, try to get group info
        if (formattedData.parent_id) {
          await loadGroupInfo(formattedData);
        }
        
        setCompany(formattedData);
        setError('');
        console.log(`✅ Successfully loaded ${entityType} with ID: ${companyId}`);
      } else {
        setError('Entity not found');
      }
    } catch (error) {
      setError('Failed to load company data');
      console.error('Failed to load company:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupInfo = async (companyData: CompanyData) => {
    if (!companyData.parent_id) return;
    
    try {
      // Try to get parent group information
      const response = await apiClient.get(`/groups/${companyData.parent_id}`);
      if (response.ok) {
        const groupData = await response.json();
        companyData.group_name = groupData.company_group_print_name || groupData.group_print_name;
      } else {
        // Try groups list endpoint
        const listResponse = await apiClient.get('/groups/');
        if (listResponse.ok) {
          const allGroups = await listResponse.json();
          const parentGroup = allGroups.find((group: any) => group.record_id === companyData.parent_id);
          if (parentGroup) {
            companyData.group_name = parentGroup.company_group_print_name || parentGroup.group_print_name;
          }
        }
      }
    } catch (error) {
      console.log('Could not load group info:', error);
      // Not critical, continue without group info
    }
  };

  const getIndustryName = (industryId: number): string => {
    const industry = allIndustries.find(i => i.id === industryId);
    return industry ? industry.industry_name : `Industry ${industryId}`;
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 4) return 'emerald';
    if (rating === 3) return 'yellow';
    if (rating === 2) return 'gray';
    if (rating === 1) return 'orange';
    return 'red';
  };

  const getRatingIcon = (rating: number): string => {
    if (rating >= 4) return '⭐';
    if (rating === 3) return '⚡';
    if (rating === 2) return '❓';
    if (rating === 1) return '⚠️';
    return '❌';
  };

  const getOperations = () => {
    if (!company) return [];
    return Object.entries(company.operations)
      .filter(([_, value]) => value)
      .map(([key, _]) => key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '));
  };

  // Debug logging
  console.log('CompanyView render state:', { 
    loading, 
    error, 
    company: company ? 'loaded' : 'null', 
    companyId, 
    companyData: companyData ? 'provided' : 'null' 
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading company data...</p>
          <p className="mt-1 text-xs text-gray-500">Company ID: {companyId}</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-lg mb-2">⚠️</div>
        <h3 className="text-lg font-medium mb-2">Error Loading Company</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Company data not found'}</p>
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
      case 'inactive':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'dormant':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Company':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Group':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
      case 'Division':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400';
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
                Edit Company
              </button>
            )}
          </div>

          {/* Company Details */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            {/* Company Header */}
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  company.company_group_data_type === 'Company' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : company.company_group_data_type === 'Group'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                }`}>
                  {company.company_group_data_type.charAt(0)}
                </div>
                <div>
                  <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {company.company_group_print_name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded ${
                      company.company_group_data_type === 'Company' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : company.company_group_data_type === 'Group'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                    }`}>
                      {company.company_group_data_type}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      (company.living_status || 'Active').toLowerCase() === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : (company.living_status || '').toLowerCase() === 'inactive'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {company.living_status || 'Active'}
                    </span>
                    {company.group_name && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}>
                        Group: {company.group_name}
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
                      {company.legal_name && company.legal_name !== company.company_group_print_name && (
                        <div>
                          <dt className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Legal Name</dt>
                          <dd className={`text-sm mt-1 ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{company.legal_name}</dd>
                        </div>
                      )}
                      {company.other_names && (
                        <div>
                          <dt className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Other Names</dt>
                          <dd className={`text-sm mt-1 ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{company.other_names}</dd>
                        </div>
                      )}
                      {company.company_group_data_type === 'Company' && company.ownership_type && (
                        <div>
                          <dt className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Ownership Type</dt>
                          <dd className={`text-sm mt-1 ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{company.ownership_type}</dd>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {company.company_group_data_type === 'Company' && company.global_operations && (
                        <div>
                          <dt className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Global Operations</dt>
                          <dd className={`text-sm mt-1 ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{company.global_operations}</dd>
                        </div>
                      )}
                      {company.company_group_data_type === 'Company' && company.founding_year && (
                        <div>
                          <dt className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Founded</dt>
                          <dd className={`text-sm mt-1 ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{company.founding_year}</dd>
                        </div>
                      )}
                      {company.company_group_data_type === 'Company' && company.company_size && (
                        <div>
                          <dt className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Company Size</dt>
                          <dd className={`text-sm mt-1 ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{company.company_size}/5</dd>
                        </div>
                      )}
                    </div>
                  </div>
                  {company.company_group_data_type === 'Company' && (company.ntn_no || (company.websites && company.websites.length > 0)) && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {company.ntn_no && (
                          <div>
                            <dt className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>NTN Number</dt>
                            <dd className={`text-sm mt-1 font-mono ${
                              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                            }`}>{company.ntn_no}</dd>
                          </div>
                        )}
                        {company.websites && company.websites.length > 0 && (
                          <div>
                            <dt className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>Website{company.websites.length > 1 ? 's' : ''}</dt>
                            <dd className="text-sm mt-1 space-y-1">
                              {company.websites.map((website, index) => (
                                <div key={index}>
                                  <a 
                                    href={website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline block"
                                  >
                                    {website}
                                  </a>
                                </div>
                              ))}
                            </dd>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Business Operations */}
                {company.company_group_data_type === 'Company' && getOperations().length > 0 && (
                  <div>
                    <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Business Operations
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {getOperations().map((operation, index) => (
                        <span
                          key={index}
                          className={`px-3 py-1 text-sm rounded-full ${
                            theme === 'dark'
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {operation}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assessment Ratings */}
                {company.company_group_data_type === 'Company' && (
                  <div>
                    <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Assessment Ratings
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <dt className={`text-xs font-medium ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>Brand Image</dt>
                        <dd className={`text-lg font-semibold mt-1 ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        }`}>{company.company_brand_image || 0}<span className="text-sm text-gray-500">/5</span></dd>
                      </div>
                      <div className="text-center">
                        <dt className={`text-xs font-medium ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>Business Volume</dt>
                        <dd className={`text-lg font-semibold mt-1 ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        }`}>{company.company_business_volume || 0}<span className="text-sm text-gray-500">/5</span></dd>
                      </div>
                      <div className="text-center">
                        <dt className={`text-xs font-medium ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>Financials</dt>
                        <dd className={`text-lg font-semibold mt-1 ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        }`}>{company.company_financials || 0}<span className="text-sm text-gray-500">/5</span></dd>
                      </div>
                      <div className="text-center">
                        <dt className={`text-xs font-medium ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>IISOL Relations</dt>
                        <dd className={`text-lg font-semibold mt-1 ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        }`}>{company.iisol_relationship || 0}<span className="text-sm text-gray-500">/5</span></dd>
                      </div>
                    </div>
                  </div>
                )}

                {/* Industries */}
                {company.company_group_data_type === 'Company' && company.selected_industries.length > 0 && (
                  <div>
                    <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Industries ({company.selected_industries.length})
                    </h2>
                    <div className="space-y-1">
                      {company.selected_industries.map((industryId) => (
                        <div
                          key={industryId}
                          className={`text-sm py-2 px-3 rounded ${
                            theme === 'dark'
                              ? 'bg-gray-700/50 text-gray-300'
                              : 'bg-gray-50 text-gray-700'
                          }`}
                        >
                          {getIndustryName(industryId)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (renderError) {
    console.error('CompanyView render error:', renderError);
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-lg mb-2">⚠️</div>
        <h3 className="text-lg font-medium mb-2">Rendering Error</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          An error occurred while displaying company information
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

export default CompanyView;