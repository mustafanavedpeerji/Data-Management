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
      console.log('Loading company data for ID:', companyId);
      
      // Try multiple endpoints to find the company data
      let response;
      let data;
      
      try {
        // Try individual company endpoint first
        response = await apiClient.get(`/companies/${companyId}`);
        if (response.ok) {
          data = await response.json();
          console.log('Company data loaded from individual endpoint:', data);
        }
      } catch (error) {
        console.log('Individual endpoint failed, trying companies list...');
        // If that fails, try getting from companies list
        response = await apiClient.get('/companies/');
        if (response.ok) {
          const allCompanies = await response.json();
          data = allCompanies.find((c: Company) => c.record_id === companyId);
          console.log('Company data found in companies list:', data);
        }
      }
      
      if (data) {
        // Ensure data structure compatibility
        const formattedData = {
          ...data,
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
      } else {
        setError('Company not found');
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
      <div className={`w-full max-w-6xl mx-auto p-6 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-2xl">
                {company.company_group_data_type === 'Group' ? '🏭' : 
                 company.company_group_data_type === 'Company' ? '🏢' : '🏪'}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{company.company_group_print_name || 'Company Name'}</h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {company.company_group_data_type || 'Company'} • {company.living_status || 'Active'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ← Back
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Edit Company
              </button>
            )}
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📋</span> Basic Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Legal Name</label>
              <p className="text-sm">{company.legal_name}</p>
            </div>
            {company.other_names && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Other Names</label>
                <p className="text-sm">{company.other_names}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Ownership Type</label>
                <p className="text-sm">{company.ownership_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Global Operations</label>
                <p className="text-sm">{company.global_operations}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Founded</label>
                <p className="text-sm">{company.founding_year || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Established</label>
                <p className="text-sm">
                  {company.established_day && company.established_month 
                    ? `${company.established_day}/${company.established_month}` 
                    : 'Not specified'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Company Size</label>
                <p className="text-sm">{company.company_size ? `${company.company_size}/5` : 'Not specified'}</p>
              </div>
              {company.ntn_no && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">NTN Number</label>
                  <p className="text-sm">{company.ntn_no}</p>
                </div>
              )}
            </div>
            {company.website && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</label>
                <p className="text-sm">
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
          </div>
        </div>

        {/* Business Operations */}
        <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>⚙️</span> Business Operations
          </h2>
          {getOperations().length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {getOperations().map((operation, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    theme === 'dark'
                      ? 'bg-blue-900/50 text-blue-200 border border-blue-700'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {operation}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No operations specified</p>
          )}
        </div>

        {/* Industries */}
        <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🏭</span> Industries ({company.selected_industries.length})
          </h2>
          {company.selected_industries.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {company.selected_industries.map((industryId) => (
                <div
                  key={industryId}
                  className={`px-3 py-2 rounded border text-sm ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-200'
                      : 'bg-gray-50 border-gray-200 text-gray-800'
                  }`}
                >
                  {getIndustryName(industryId)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No industries selected</p>
          )}
        </div>

        {/* Ratings & Assessments */}
        <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📊</span> Ratings & Assessments
          </h2>
          <div className="space-y-4">
            {[
              { label: 'Brand Image', value: company.company_brand_image, icon: '🏆' },
              { label: 'Business Volume', value: company.company_business_volume, icon: '📈' },
              { label: 'Financials', value: company.company_financials, icon: '💰' },
              { label: 'IISOL Relationship', value: company.iisol_relationship, icon: '🤝' }
            ].map((rating) => (
              <div key={rating.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{rating.icon}</span>
                  <span className="text-sm font-medium">{rating.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {rating.value ? (
                    <>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-lg ${
                              star <= rating.value
                                ? rating.value >= 4 ? 'text-emerald-500'
                                : rating.value === 3 ? 'text-yellow-500'
                                : rating.value === 2 ? 'text-gray-500'
                                : rating.value === 1 ? 'text-orange-500'
                                : 'text-red-500'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          >
                            {getRatingIcon(rating.value)}
                          </span>
                        ))}
                      </div>
                      <span className="text-sm font-medium">{rating.value}/5</span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">Not rated</span>
                  )}
                </div>
              </div>
            ))}
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