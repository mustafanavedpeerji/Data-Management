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
  website: string;
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
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'inactive':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'dormant':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Company': return '🏢';
      case 'Group': return '🏢';
      case 'Division': return '🏪';
      default: return '🏢';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Company':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Group':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'Division':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  try {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto p-6">
          {/* Header Section */}
          <div className={`rounded-xl shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} mb-6`}>
            <div className="p-6">
              {/* Top Actions */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {onBack && (
                    <button
                      onClick={onBack}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        theme === 'dark'
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                  )}
                  <nav className="text-sm text-gray-500 dark:text-gray-400">
                    <span>Companies</span> / <span className="text-gray-900 dark:text-gray-100 font-medium">Details</span>
                  </nav>
                </div>
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>

              {/* Company Header */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className={`w-16 h-16 rounded-xl ${getTypeColor(company.company_group_data_type)} flex items-center justify-center text-2xl`}>
                    {getTypeIcon(company.company_group_data_type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                    {company.company_group_print_name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(company.company_group_data_type)}`}>
                      {company.company_group_data_type}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(company.living_status)}`}>
                      {company.living_status || 'Active'}
                    </span>
                    {company.group_name && (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}>
                        Group: {company.group_name}
                      </span>
                    )}
                  </div>
                  {company.legal_name && company.legal_name !== company.company_group_print_name && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Legal Name: {company.legal_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="lg:col-span-2">
              <div className={`rounded-xl shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6`}>
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {company.other_names && (
                    <div>
                      <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                        Other Names
                      </label>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                        {company.other_names}
                      </p>
                    </div>
                  )}
                  
                  {company.company_group_data_type === 'Company' && (
                    <>
                      {company.ownership_type && (
                        <div>
                          <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                            Ownership Type
                          </label>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                            {company.ownership_type}
                          </p>
                        </div>
                      )}
                      
                      {company.global_operations && (
                        <div>
                          <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                            Global Operations
                          </label>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                            {company.global_operations}
                          </p>
                        </div>
                      )}
                      
                      {company.founding_year && (
                        <div>
                          <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                            Founded
                          </label>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                            {company.founding_year}
                          </p>
                        </div>
                      )}
                      
                      {(company.established_day && company.established_month) && (
                        <div>
                          <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                            Established
                          </label>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                            {company.established_day}/{company.established_month}
                          </p>
                        </div>
                      )}
                      
                      {company.company_size && (
                        <div>
                          <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                            Company Size
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= company.company_size ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              ({company.company_size}/5)
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {company.ntn_no && (
                        <div>
                          <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                            NTN Number
                          </label>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'} font-mono`}>
                            {company.ntn_no}
                          </p>
                        </div>
                      )}
                      
                      {company.website && (
                        <div className="md:col-span-2">
                          <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                            Website
                          </label>
                          <a 
                            href={company.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm inline-flex items-center gap-1 transition-colors"
                          >
                            {company.website}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
              {company.company_group_data_type === 'Company' && (
                <>
                  {/* Ratings */}
                  <div className={`rounded-xl shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6`}>
                    <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                      Ratings & Assessments
                    </h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Brand Image', value: company.company_brand_image, icon: '⭐' },
                        { label: 'Business Volume', value: company.company_business_volume, icon: '📈' },
                        { label: 'Financials', value: company.company_financials, icon: '💰' },
                        { label: 'IISOL Relationship', value: company.iisol_relationship, icon: '🤝' }
                      ].map((rating) => (
                        <div key={rating.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{rating.icon}</span>
                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {rating.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-3 h-3 ${
                                    rating.value && star <= rating.value ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                              {rating.value || 0}/5
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Additional Sections for Companies */}
          {company.company_group_data_type === 'Company' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Business Operations */}
              <div className={`rounded-xl shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6`}>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                  <span className="text-xl">🔧</span>
                  Business Operations
                </h3>
                {getOperations().length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {getOperations().map((operation, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          theme === 'dark'
                            ? 'bg-blue-900/20 text-blue-400 border border-blue-800'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {operation}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    No operations specified
                  </p>
                )}
              </div>

              {/* Industries */}
              <div className={`rounded-xl shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6`}>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                  <span className="text-xl">🏭</span>
                  Industries ({company.selected_industries.length})
                </h3>
                {company.selected_industries.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {company.selected_industries.map((industryId) => (
                      <div
                        key={industryId}
                        className={`flex items-center gap-2 p-2 rounded-lg ${
                          theme === 'dark'
                            ? 'bg-purple-900/20 text-purple-300 border border-purple-800'
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}
                      >
                        <span className="w-2 h-2 bg-current rounded-full flex-shrink-0"></span>
                        <span className="text-sm">{getIndustryName(industryId)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    No industries selected
                  </p>
                )}
              </div>
            </div>
          )}
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