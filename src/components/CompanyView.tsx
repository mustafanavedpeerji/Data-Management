import React, { useState, useEffect, useCallback } from 'react';
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
  children?: CompanyData[];
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
  const [allCompanies, setAllCompanies] = useState<CompanyData[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(companyData || null);
  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    loadIndustries();
    loadAllCompanies();
  }, []);

  useEffect(() => {
    if (companyId && allCompanies.length > 0) {
      const foundCompany = findCompanyInTree(allCompanies, companyId);
      if (foundCompany) {
        setSelectedCompany(foundCompany);
      }
    }
  }, [companyId, allCompanies]);

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

  const loadAllCompanies = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/companies/');
      if (response.ok) {
        const data = await response.json();
        const tree = buildCompanyTree(data);
        setAllCompanies(tree);
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
  };

  const buildCompanyTree = (flatData: CompanyData[]): CompanyData[] => {
    const map = new Map<string, CompanyData>();
    const roots: CompanyData[] = [];

    // Create maps for reference
    const companiesMap = new Map<string, CompanyData>();
    const groupsMap = new Map<string, CompanyData>();
    
    // Separate companies, divisions, and groups
    flatData.forEach(item => {
      if (item.company_group_data_type === 'Group') {
        groupsMap.set(item.record_id!, item);
      } else {
        companiesMap.set(item.record_id!, item);
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
      
      map.set(company.record_id!, enhanced);
    });

    // Second pass: build tree structure (only companies and divisions)
    companiesMap.forEach(company => {
      const companyNode = map.get(company.record_id!)!;
      
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

  const findCompanyInTree = (companies: CompanyData[], targetId: string): CompanyData | null => {
    for (const company of companies) {
      if (company.record_id === targetId) {
        return company;
      }
      if (company.children && company.children.length > 0) {
        const found = findCompanyInTree(company.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

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

  const handleCompanySelect = (company: CompanyData) => {
    setSelectedCompany(company);
  };

  const filterCompanies = useCallback((companies: CompanyData[], term: string): CompanyData[] => {
    if (!term) return companies;
    const lowerTerm = term.toLowerCase();
    const filterNode = (company: CompanyData): CompanyData | null => {
      const matches = (
        company.company_group_print_name.toLowerCase().includes(lowerTerm) ||
        (company.legal_name && company.legal_name.toLowerCase().includes(lowerTerm)) ||
        (company.other_names && company.other_names.toLowerCase().includes(lowerTerm)) ||
        (company.group_name && company.group_name.toLowerCase().includes(lowerTerm))
      );
      const filteredChildren = company.children
        ? company.children.map(filterNode).filter((child): child is CompanyData => child !== null)
        : [];
      if (matches || filteredChildren.length > 0) {
        return { ...company, children: filteredChildren };
      }
      return null;
    };
    return companies.map(filterNode).filter((company): company is CompanyData => company !== null);
  }, []);

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

  const getOperations = (company: CompanyData) => {
    if (!company || !company.operations) return [];
    return Object.entries(company.operations)
      .filter(([_, value]) => value)
      .map(([key, _]) => key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '));
  };

  const getCompanyTypeConfig = (type: string) => {
    switch (type) {
      case 'Company':
        return { 
          icon: '🏢', 
          color: 'text-blue-700 dark:text-blue-400', 
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        };
      case 'Division':
        return { 
          icon: '🏪', 
          color: 'text-purple-700 dark:text-purple-400', 
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        };
      default:
        return { 
          icon: '🏢', 
          color: 'text-gray-700 dark:text-gray-400', 
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        };
    }
  };

  const CompanyTreeNode: React.FC<{ company: CompanyData; level?: number }> = ({ company, level = 0 }) => {
    const hasChildren = company.children && company.children.length > 0;
    const isExpanded = expandedNodes.has(company.record_id!);
    const typeConfig = getCompanyTypeConfig(company.company_group_data_type);
    const isSelected = selectedCompany?.record_id === company.record_id;

    return (
      <div>
        <div 
          className={`flex items-center py-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer ${
            isSelected ? 'bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 16}px` }}
          onClick={() => handleCompanySelect(company)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(company.record_id!);
              }}
              className="mr-3 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
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
          )}
          
          {!hasChildren && <div className="w-6 mr-3" />}
          
          <div className={`p-2 rounded-lg ${typeConfig.bgColor} mr-3`}>
            <span className="text-lg">{typeConfig.icon}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold text-sm truncate ${typeConfig.color}`}>
                {company.company_group_print_name}
              </h3>
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
                {company.company_group_data_type}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              {company.legal_name && (
                <p>Legal: {company.legal_name}</p>
              )}
              {company.group_name && (
                <p><span className="font-medium">Group:</span> {company.group_name}</p>
              )}
            </div>
          </div>
        </div>
        
        {hasChildren && isExpanded && company.children && (
          <div>
            {company.children.map(child => (
              <CompanyTreeNode key={child.record_id} company={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const filteredCompanies = filterCompanies(allCompanies, searchTerm);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading companies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-lg mb-2">⚠️</div>
        <h3 className="text-lg font-medium mb-2">Error Loading Companies</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={loadAllCompanies}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  try {
    return (
      <div className={`w-full h-screen flex ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
        {/* Left Sidebar - Company Tree */}
        <div className={`w-1/3 border-r ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} overflow-y-auto`}>
          {/* Header */}
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Companies & Divisions</h2>
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
            </div>
            
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
                className={`w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>
          
          {/* Tree */}
          <div className="p-4">
            {filteredCompanies.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🏢</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No companies match your search.' : 'No companies found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCompanies.map(company => (
                  <CompanyTreeNode key={company.record_id} company={company} />
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Panel - Company Details */}
        <div className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {selectedCompany ? (
            <div className="p-6">
              {/* Header */}
              <div className={`flex items-center justify-between mb-6 pb-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${getCompanyTypeConfig(selectedCompany.company_group_data_type).bgColor}`}>
                    <span className="text-2xl">{getCompanyTypeConfig(selectedCompany.company_group_data_type).icon}</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{selectedCompany.company_group_print_name}</h1>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                        getCompanyTypeConfig(selectedCompany.company_group_data_type).bgColor
                      } ${getCompanyTypeConfig(selectedCompany.company_group_data_type).color}`}>
                        {selectedCompany.company_group_data_type}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedCompany.living_status || 'Active'}
                      </span>
                      {selectedCompany.group_name && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Group:</span> {selectedCompany.group_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Basic Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Legal Name</label>
                      <p className="text-sm mt-1">{selectedCompany.legal_name || 'Not specified'}</p>
                    </div>
                    {selectedCompany.other_names && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Other Names</label>
                        <p className="text-sm mt-1">{selectedCompany.other_names}</p>
                      </div>
                    )}
                    {selectedCompany.company_group_data_type === 'Company' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Ownership Type</label>
                            <p className="text-sm mt-1">{selectedCompany.ownership_type || 'Not specified'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Global Operations</label>
                            <p className="text-sm mt-1">{selectedCompany.global_operations || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Founded</label>
                            <p className="text-sm mt-1">{selectedCompany.founding_year || 'Not specified'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Company Size</label>
                            <p className="text-sm mt-1">{selectedCompany.company_size ? `${selectedCompany.company_size}/5` : 'Not specified'}</p>
                          </div>
                        </div>
                        {(selectedCompany.ntn_no || selectedCompany.website) && (
                          <div className="grid grid-cols-1 gap-4">
                            {selectedCompany.ntn_no && (
                              <div>
                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">NTN Number</label>
                                <p className="text-sm mt-1">{selectedCompany.ntn_no}</p>
                              </div>
                            )}
                            {selectedCompany.website && (
                              <div>
                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</label>
                                <p className="text-sm mt-1">
                                  <a 
                                    href={selectedCompany.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    {selectedCompany.website}
                                  </a>
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {selectedCompany.company_group_data_type === 'Company' && (
                  <>
                    {/* Business Operations */}
                    <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Business Operations
                      </h3>
                      {getOperations(selectedCompany).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {getOperations(selectedCompany).map((operation, index) => (
                            <span
                              key={index}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                                theme === 'dark'
                                  ? 'bg-green-900/30 text-green-400 border border-green-700'
                                  : 'bg-green-100 text-green-800 border border-green-200'
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
                    <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        Industries ({selectedCompany.selected_industries?.length || 0})
                      </h3>
                      {selectedCompany.selected_industries && selectedCompany.selected_industries.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {selectedCompany.selected_industries.map((industryId) => (
                            <div
                              key={industryId}
                              className={`px-3 py-2 rounded-lg text-sm ${
                                theme === 'dark'
                                  ? 'bg-purple-900/30 text-purple-300 border border-purple-700'
                                  : 'bg-purple-100 text-purple-800 border border-purple-200'
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
                    <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        Ratings & Assessments
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Brand Image', value: selectedCompany.company_brand_image, icon: '⭐' },
                          { label: 'Business Volume', value: selectedCompany.company_business_volume, icon: '📈' },
                          { label: 'Financials', value: selectedCompany.company_financials, icon: '💰' },
                          { label: 'IISOL Relationship', value: selectedCompany.iisol_relationship, icon: '🤝' }
                        ].map((rating) => (
                          <div key={rating.label} className={`p-3 rounded-lg ${
                            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span>{rating.icon}</span>
                              <span className="text-sm font-medium">{rating.label}</span>
                            </div>
                            <p className="text-lg font-bold">
                              {rating.value ? `${rating.value}/5` : 'Not rated'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">🏢</div>
                <h3 className="text-xl font-semibold mb-2">Select a Company</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Choose a company or division from the tree to view its details
                </p>
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