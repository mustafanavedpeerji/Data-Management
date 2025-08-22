import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import PageMeta from '../components/common/PageMeta';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/apiClient';

interface Company {
  record_id: string;
  company_group_print_name: string;
  company_group_data_type: 'Company' | 'Group' | 'Division';
  parent_id: string | null;
  legal_name?: string;
  other_names?: string;
  living_status?: string;
  ownership_type?: string;
  global_operations?: string;
  founding_year?: string;
  established_date?: string;
  company_size?: number;
  ntn_no?: string;
  company_brand_image?: number;
  company_business_volume?: number;
  company_financials?: number;
  iisol_relationship?: number;
  operations?: {
    imports?: boolean;
    exports?: boolean;
    manufacture?: boolean;
    distribution?: boolean;
    wholesale?: boolean;
    retail?: boolean;
    services?: boolean;
    online?: boolean;
    soft_products?: boolean;
  };
  selected_industries?: number[];
  children?: Company[];
  group_name?: string;
}

const CompanyListPage = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Load companies
  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/companies/');
      if (response.ok) {
        const data = await response.json();
        // Build tree structure
        const tree = buildTree(data);
        setCompanies(tree);
        setError('');
      } else {
        throw new Error('Failed to fetch companies');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load companies: ${errorMessage}`);
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Build tree structure from flat array - filter out groups
  const buildTree = (flatData: Company[]): Company[] => {
    const map = new Map<string, Company>();
    const roots: Company[] = [];

    // Create maps for reference
    const companiesMap = new Map<string, Company>();
    const groupsMap = new Map<string, Company>();
    
    // Separate companies, divisions, and groups
    flatData.forEach(item => {
      if (item.company_group_data_type === 'Group') {
        groupsMap.set(item.record_id, item);
      } else {
        companiesMap.set(item.record_id, item);
      }
    });

    // First pass: create enhanced company/division objects with group info
    companiesMap.forEach(company => {
      const enhanced = { ...company, children: [] };
      
      // If parent is a group, add group name for display
      if (company.parent_id && groupsMap.has(company.parent_id)) {
        const parentGroup = groupsMap.get(company.parent_id)!;
        enhanced.group_name = parentGroup.company_group_print_name;
      }
      
      map.set(company.record_id, enhanced);
    });

    // Second pass: build tree structure (only companies and divisions)
    companiesMap.forEach(company => {
      const companyNode = map.get(company.record_id)!;
      
      if (company.parent_id && map.has(company.parent_id)) {
        // Parent is a company - create parent-child relationship
        const parent = map.get(company.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(companyNode);
      } else {
        // No parent or parent is a group - make this a root node
        roots.push(companyNode);
      }
    });

    return roots;
  };

  // Toggle node expansion
  const toggleNode = useCallback((companyId: string) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(companyId)) {
        newExpanded.delete(companyId);
      } else {
        newExpanded.add(companyId);
      }
      return newExpanded;
    });
  }, []);

  // Filter companies based on search term
  const filterCompanies = useCallback((companies: Company[], term: string): Company[] => {
    if (!term) return companies;
    const lowerTerm = term.toLowerCase();
    const filterNode = (company: Company): Company | null => {
      const matches = (
        company.company_group_print_name.toLowerCase().includes(lowerTerm) ||
        (company.legal_name && company.legal_name.toLowerCase().includes(lowerTerm)) ||
        (company.other_names && company.other_names.toLowerCase().includes(lowerTerm)) ||
        (company.group_name && company.group_name.toLowerCase().includes(lowerTerm))
      );
      const filteredChildren = company.children
        ? company.children.map(filterNode).filter((child): child is Company => child !== null)
        : [];
      if (matches || filteredChildren.length > 0) {
        return { ...company, children: filteredChildren };
      }
      return null;
    };
    return companies.map(filterNode).filter((company): company is Company => company !== null);
  }, []);

  // Get company type icon and color
  const getCompanyTypeConfig = (type: string) => {
    switch (type) {
      case 'Group':
        return { 
          icon: '🏭', 
          color: 'text-green-700 dark:text-green-400', 
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-700'
        };
      case 'Company':
        return { 
          icon: '🏢', 
          color: 'text-blue-700 dark:text-blue-400', 
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-700'
        };
      case 'Division':
        return { 
          icon: '🏪', 
          color: 'text-purple-700 dark:text-purple-400', 
          bgColor: 'bg-purple-100 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-700'
        };
      default:
        return { 
          icon: '🏢', 
          color: 'text-gray-700 dark:text-gray-400', 
          bgColor: 'bg-gray-100 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-700'
        };
    }
  };

  // Get rating color
  const getRatingColor = (rating?: number): string => {
    if (!rating) return 'text-gray-400';
    if (rating >= 4) return 'text-emerald-500';
    if (rating === 3) return 'text-yellow-500';
    if (rating === 2) return 'text-gray-500';
    if (rating === 1) return 'text-orange-500';
    return 'text-red-500';
  };

  // Get operations count
  const getOperationsCount = (operations?: Company['operations']): number => {
    if (!operations) return 0;
    return Object.values(operations).filter(Boolean).length;
  };

  // Company Node Component
  const CompanyNode: React.FC<{ company: Company; level?: number }> = ({ company, level = 0 }) => {
    const hasChildren = company.children && company.children.length > 0;
    const isExpanded = expandedNodes.has(company.record_id);
    const typeConfig = getCompanyTypeConfig(company.company_group_data_type);

    const handleViewDetails = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/company/view/${company.record_id}`);
    };

    return (
      <div className="relative">
        {/* Company Card */}
        <div 
          className={`
            border rounded-lg p-4 mb-3 transition-all duration-200 hover:shadow-md cursor-pointer
            ${typeConfig.bgColor} ${typeConfig.borderColor}
            ${theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}
          `}
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className="flex items-start justify-between">
            {/* Left: Company Info */}
            <div className="flex items-start gap-3 flex-1">
              {/* Expand/Collapse Button */}
              <div className="flex items-center">
                {hasChildren ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNode(company.record_id);
                    }}
                    className={`p-1 rounded transition-colors ${
                      theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                    }`}
                  >
                    <svg 
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <div className="w-6 h-6" />
                )}
              </div>

              {/* Company Type Icon */}
              <div className="text-2xl">{typeConfig.icon}</div>

              {/* Company Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-semibold text-lg ${typeConfig.color} truncate`}>
                    {company.company_group_print_name}
                  </h3>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
                    {company.company_group_data_type}
                  </span>
                </div>

                {company.legal_name && (
                  <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    Legal: {company.legal_name}
                  </p>
                )}

                {company.group_name && (
                  <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="font-medium">Group:</span> {company.group_name}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-xs">
                  {company.living_status && (
                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Status: <span className="font-medium">{company.living_status}</span>
                    </span>
                  )}
                  {company.ownership_type && (
                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Type: <span className="font-medium">{company.ownership_type}</span>
                    </span>
                  )}
                  {company.global_operations && (
                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Ops: <span className="font-medium">{company.global_operations}</span>
                    </span>
                  )}
                  {company.founding_year && (
                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Founded: <span className="font-medium">{company.founding_year}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Stats & Actions */}
            <div className="flex items-start gap-4">
              {/* Quick Stats */}
              <div className="text-right space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Size:</span>
                  <span className="font-medium">{company.company_size || 'N/A'}/5</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Operations:</span>
                  <span className="font-medium">{getOperationsCount(company.operations)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Industries:</span>
                  <span className="font-medium">{company.selected_industries?.length || 0}</span>
                </div>
                {/* Ratings */}
                <div className="flex gap-1 text-xs">
                  <span className={getRatingColor(company.company_brand_image)}>⭐</span>
                  <span className={getRatingColor(company.company_business_volume)}>📈</span>
                  <span className={getRatingColor(company.company_financials)}>💰</span>
                  <span className={getRatingColor(company.iisol_relationship)}>🤝</span>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={handleViewDetails}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                View Details
              </button>
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && company.children && (
          <div className="space-y-2">
            {company.children.map(child => (
              <CompanyNode key={child.record_id} company={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const filteredCompanies = filterCompanies(companies, searchTerm);

  if (loading) {
    return (
      <>
        <PageMeta
          title="Company View"
          description="View all companies in tree structure"
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading companies...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Company View"
        description="View all companies in tree structure"
      />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
              Company View
            </h1>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/company')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                + Add Company
              </button>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={fetchCompanies}
                className="px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          
          {/* Search */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
        </div>
        
        {/* Company Tree */}
        <div className="space-y-2">
          {filteredCompanies.length === 0 ? (
            <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="text-4xl mb-4">🏢</div>
              <p className="text-lg mb-2">
                {searchTerm ? 'No companies match your search.' : 'No companies found.'}
              </p>
              <p className="text-sm mb-4">
                {!searchTerm && 'Add your first company to get started.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => navigate('/company')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Company
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCompanies.map(company => (
                <CompanyNode key={company.record_id} company={company} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CompanyListPage;