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

  // Load companies, divisions, and groups
  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch companies, divisions, and groups
      const [companiesResponse, divisionsResponse, groupsResponse] = await Promise.all([
        apiClient.get('/companies/'),
        apiClient.get('/divisions/'),
        apiClient.get('/groups/')
      ]);

      if (!companiesResponse.ok) {
        throw new Error('Failed to fetch companies');
      }

      const companiesData = await companiesResponse.json();
      console.log('📊 Companies data:', companiesData.length, 'items');

      let divisionsData = [];
      if (divisionsResponse.ok) {
        divisionsData = await divisionsResponse.json();
        console.log('📊 Divisions data:', divisionsData.length, 'items');
        
        // Transform divisions to match company structure
        divisionsData = divisionsData.map((division: any) => ({
          record_id: division.record_id,
          company_group_print_name: division.division_print_name,
          company_group_data_type: 'Division' as const,
          parent_id: division.parent_id,
          legal_name: division.legal_name,
          other_names: division.other_names,
          living_status: division.living_status,
          created_at: division.created_at,
          updated_at: division.updated_at
        }));
      } else {
        console.warn('Failed to fetch divisions, continuing without divisions');
      }

      let groupsData = [];
      if (groupsResponse.ok) {
        groupsData = await groupsResponse.json();
        console.log('📊 Groups data:', groupsData.length, 'items');
        
        // Transform groups to match company structure for consistent handling
        groupsData = groupsData.map((group: any) => ({
          record_id: group.record_id,
          company_group_print_name: group.group_print_name,
          group_print_name: group.group_print_name, // Keep original for reference
          company_group_data_type: 'Group' as const,
          parent_id: group.parent_id,
          legal_name: group.legal_name,
          other_names: group.other_names,
          living_status: group.living_status,
          created_at: group.created_at,
          updated_at: group.updated_at
        }));
      } else {
        console.warn('Failed to fetch groups, continuing without groups');
      }

      // Combine all data
      const allData = [...companiesData, ...divisionsData, ...groupsData];
      console.log('📊 Total combined data:', allData.length, 'items');
      
      // Build tree structure
      const tree = buildTree(allData);
      setCompanies(tree);
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load data: ${errorMessage}`);
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Build tree structure from flat array - show only Companies and Divisions (not Groups)
  const buildTree = (flatData: Company[]): Company[] => {
    const map = new Map<string, Company>();
    const roots: Company[] = [];

    // Create maps for reference
    const companiesAndDivisionsMap = new Map<string, Company>();
    const groupsMap = new Map<string, Company>();
    
    // Separate entities: only include Companies and Divisions in display, but keep Groups for reference
    flatData.forEach(item => {
      if (item.company_group_data_type === 'Group') {
        groupsMap.set(item.record_id, item);
      } else if (item.company_group_data_type === 'Company' || item.company_group_data_type === 'Division') {
        companiesAndDivisionsMap.set(item.record_id, item);
      }
    });

    console.log('🔍 Building tree with:', {
      totalItems: flatData.length,
      groups: groupsMap.size,
      companies: Array.from(companiesAndDivisionsMap.values()).filter(e => e.company_group_data_type === 'Company').length,
      divisions: Array.from(companiesAndDivisionsMap.values()).filter(e => e.company_group_data_type === 'Division').length
    });

    // First pass: create enhanced company/division objects with group info
    companiesAndDivisionsMap.forEach(entity => {
      const enhanced = { ...entity, children: [] };
      
      // If parent is a group, add group name for display
      if (entity.parent_id && groupsMap.has(entity.parent_id)) {
        const parentGroup = groupsMap.get(entity.parent_id)!;
        enhanced.group_name = parentGroup.company_group_print_name || parentGroup.group_print_name;
      }
      
      map.set(entity.record_id, enhanced);
    });

    // Second pass: build tree structure (only companies and divisions)
    companiesAndDivisionsMap.forEach(entity => {
      const entityNode = map.get(entity.record_id)!;
      
      if (entity.parent_id && map.has(entity.parent_id)) {
        // Parent is a company - create parent-child relationship (divisions under companies)
        const parent = map.get(entity.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(entityNode);
        console.log(`📝 Added ${entity.company_group_data_type} "${entity.company_group_print_name}" under ${parent.company_group_data_type} "${parent.company_group_print_name}"`);
      } else {
        // No parent or parent is a group - make this a root node
        roots.push(entityNode);
        console.log(`📝 Added ${entity.company_group_data_type} "${entity.company_group_print_name}" as root node`);
      }
    });

    console.log('🌳 Tree structure built:', {
      rootNodes: roots.length,
      totalNodesWithChildren: Array.from(map.values()).filter(node => node.children && node.children.length > 0).length
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

  // Get company type color
  const getCompanyTypeConfig = (type: string) => {
    switch (type) {
      case 'Group':
        return { 
          color: 'text-green-700 dark:text-green-400', 
          bgColor: 'bg-green-100 dark:bg-green-900/20'
        };
      case 'Company':
        return { 
          color: 'text-blue-700 dark:text-blue-400', 
          bgColor: 'bg-blue-100 dark:bg-blue-900/20'
        };
      case 'Division':
        return { 
          color: 'text-purple-700 dark:text-purple-400', 
          bgColor: 'bg-purple-100 dark:bg-purple-900/20'
        };
      default:
        return { 
          color: 'text-gray-700 dark:text-gray-400', 
          bgColor: 'bg-gray-100 dark:bg-gray-900/20'
        };
    }
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
        {/* Company Row */}
        <div 
          className={`
            border rounded p-3 mb-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50
            ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          `}
          style={{ marginLeft: `${level * 20}px` }}
        >
          <div className="flex items-center justify-between">
            {/* Left: Company Info */}
            <div className="flex items-center gap-3 flex-1">
              {/* Expand/Collapse Button */}
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
                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="w-5 h-5" />
              )}

              {/* Company Type Badge */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${typeConfig.bgColor} ${typeConfig.color}`}>
                {company.company_group_data_type.charAt(0)}
              </div>

              {/* Company Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} truncate`}>
                    {company.company_group_print_name}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                    {company.company_group_data_type}
                  </span>
                  {company.living_status && (
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      company.living_status.toLowerCase() === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : company.living_status.toLowerCase() === 'inactive'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {company.living_status}
                    </span>
                  )}
                  {company.group_name && (
                    <span className="px-2 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400">
                      Group: {company.group_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  {company.legal_name && company.legal_name !== company.company_group_print_name && (
                    <span>Legal: {company.legal_name}</span>
                  )}
                  {company.company_group_data_type === 'Company' && (
                    <>
                      {company.ownership_type && (
                        <span>Type: {company.ownership_type}</span>
                      )}
                      {company.founding_year && (
                        <span>Founded: {company.founding_year}</span>
                      )}
                    </>
                  )}
                  {company.company_group_data_type === 'Division' && (
                    <>
                      {company.other_names && (
                        <span>Other: {company.other_names}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Stats & Actions */}
            <div className="flex items-center gap-4">
              {/* Quick Stats - Only show relevant stats for each entity type */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                {company.company_group_data_type === 'Company' && (
                  <>
                    <span>Size: {company.company_size || 'N/A'}/5</span>
                    <span>Ops: {getOperationsCount(company.operations)}</span>
                    <span>Industries: {company.selected_industries?.length || 0}</span>
                  </>
                )}
                {company.company_group_data_type === 'Division' && (
                  <>
                    <span>Type: Division</span>
                    {company.created_at && (
                      <span>Created: {new Date(company.created_at).getFullYear()}</span>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <button
                onClick={handleViewDetails}
                className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                View
              </button>
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && company.children && (
          <div className="space-y-1">
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
            <h1 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
              Companies
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
        
        {/* Company Table */}
        <div className={`rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
          {filteredCompanies.length === 0 ? (
            <div className={`text-center py-12 ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
              <p className="text-lg mb-2">
                {searchTerm ? 'No companies match your search.' : 'No companies found.'}
              </p>
              <p className="text-sm mb-4">
                {!searchTerm && 'Add your first company to get started.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => navigate('/company')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Add Company
                </button>
              )}
            </div>
          ) : (
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              {/* Table Header */}
              <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-5"></div>
                  <div className="w-8"></div>
                  <div className="flex-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Company Details
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Quick Stats
                  </div>
                  <div className="w-16"></div>
                </div>
              </div>
              
              {/* Companies List */}
              <div className="space-y-1 p-2">
                {filteredCompanies.map(company => (
                  <CompanyNode key={company.record_id} company={company} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CompanyListPage;