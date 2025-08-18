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

  try {
    return (
      <div className={`w-full max-w-6xl mx-auto p-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-lg font-semibold">{company.company_group_print_name || 'Company Name'}</h1>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {company.company_group_data_type || 'Company'} • {company.living_status || 'Active'}
            </p>
          </div>
          <div className="flex gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Back
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium"
              >
                Edit
              </button>
            )}
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Basic Information */}
        <div className={`p-3 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className="text-sm font-medium mb-3">Basic Information</h2>
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Legal Name</label>
              <p className="text-xs">{company.legal_name}</p>
            </div>
            {company.other_names && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Other Names</label>
                <p className="text-xs">{company.other_names}</p>
              </div>
            )}
            {/* Show company-specific fields only for companies */}
            {company.company_group_data_type === 'Company' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Ownership Type</label>
                    <p className="text-xs">{company.ownership_type}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Global Operations</label>
                    <p className="text-xs">{company.global_operations}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Founded</label>
                    <p className="text-xs">{company.founding_year || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Established</label>
                    <p className="text-xs">
                      {company.established_day && company.established_month 
                        ? `${company.established_day}/${company.established_month}` 
                        : 'Not specified'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Company Size</label>
                    <p className="text-xs">{company.company_size ? `${company.company_size}/5` : 'Not specified'}</p>
                  </div>
                  {company.ntn_no && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">NTN Number</label>
                      <p className="text-xs">{company.ntn_no}</p>
                    </div>
                  )}
                </div>
                {company.website && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Website</label>
                    <p className="text-xs">
                      <a 
                        href={company.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {company.website}
                      </a>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Show company-specific sections only for companies */}
        {company.company_group_data_type === 'Company' && (
          <>
            {/* Business Operations */}
            <div className={`p-3 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className="text-sm font-medium mb-3">Business Operations</h2>
              {getOperations().length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {getOperations().map((operation, index) => (
                    <span
                      key={index}
                      className={`px-2 py-1 rounded text-xs ${
                        theme === 'dark'
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {operation}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">No operations specified</p>
              )}
            </div>

            {/* Industries */}
            <div className={`p-3 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className="text-sm font-medium mb-3">Industries ({company.selected_industries.length})</h2>
              {company.selected_industries.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {company.selected_industries.map((industryId) => (
                    <div
                      key={industryId}
                      className={`px-2 py-1 rounded text-xs ${
                        theme === 'dark'
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {getIndustryName(industryId)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">No industries selected</p>
              )}
            </div>

            {/* Ratings & Assessments */}
            <div className={`p-3 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className="text-sm font-medium mb-3">Ratings & Assessments</h2>
              <div className="space-y-2">
                {[
                  { label: 'Brand Image', value: company.company_brand_image },
                  { label: 'Business Volume', value: company.company_business_volume },
                  { label: 'Financials', value: company.company_financials },
                  { label: 'IISOL Relationship', value: company.iisol_relationship }
                ].map((rating) => (
                  <div key={rating.label} className="flex items-center justify-between">
                    <span className="text-xs font-medium">{rating.label}</span>
                    <span className="text-xs">
                      {rating.value ? `${rating.value}/5` : 'Not rated'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
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