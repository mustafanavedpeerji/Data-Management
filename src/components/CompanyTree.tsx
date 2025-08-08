import React, { useState, useEffect, memo, Component, ReactNode, useCallback, useRef } from 'react';

// Declare import.meta.env for Vite
interface ImportMetaEnv {
  VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Use environment variable for API base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://magicfingers.com.pk/backend';

// Define interface for company data
interface Company {
  record_id: string;
  company_group_print_name: string;
  company_group_data_type: 'Company' | 'Group' | 'Division';
  parent_id: string | null;
  legal_name?: string;
  other_names?: string;
  imports?: 'Y' | 'N';
  exports?: 'Y' | 'N';
  manufacture?: 'Y' | 'N';
  distribution?: 'Y' | 'N';
  wholesale?: 'Y' | 'N';
  retail?: 'Y' | 'N';
  services?: 'Y' | 'N';
  online?: 'Y' | 'N';
  soft_products?: 'Y' | 'N';
  children?: Company[];
}

// Define interface for form data
interface FormData {
  company_group_print_name: string;
  company_group_data_type: 'Company' | 'Group' | 'Division';
  parent_id: string | null;
  legal_name: string;
  other_names: string;
  imports: 'Y' | 'N';
  exports: 'Y' | 'N';
  manufacture: 'Y' | 'N';
  distribution: 'Y' | 'N';
  wholesale: 'Y' | 'N';
  retail: 'Y' | 'N';
  services: 'Y' | 'N';
  online: 'Y' | 'N';
  soft_products: 'Y' | 'N';
}

// Define props for CompanyNode
interface CompanyNodeProps {
  company: Company;
  level?: number;
}

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p>{this.state.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Simple SVG icons
const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronDown = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const Plus = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const Edit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const Trash2 = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const Building2 = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const Users = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const Layers = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
);

const Search = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const X = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Check = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Company types and their icons
const companyTypes = {
  Company: { icon: Building2, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  Group: { icon: Users, color: 'text-green-600', bgColor: 'bg-green-50' },
  Division: { icon: Layers, color: 'text-purple-600', bgColor: 'bg-purple-50' }
};

// Business activities list
const businessActivities = [
  'imports', 'exports', 'manufacture', 'distribution',
  'wholesale', 'retail', 'services', 'online', 'soft_products'
];

// Initial form state
const initialFormState: FormData = {
  company_group_print_name: '',
  company_group_data_type: 'Company',
  parent_id: null,
  legal_name: '',
  other_names: '',
  imports: 'N',
  exports: 'N',
  manufacture: 'N',
  distribution: 'N',
  wholesale: 'N',
  retail: 'N',
  services: 'N',
  online: 'N',
  soft_products: 'N'
};

// Company form component - MOVED OUTSIDE to prevent re-creation
const CompanyForm: React.FC<{ 
  isEditing: boolean; 
  onSubmit: () => void; 
  onCancel: () => void;
  formData: FormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  selectedParent: Company | null;
}> = memo(({ isEditing, onSubmit, onCancel, formData, onInputChange, selectedParent }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Company' : 'Add New Company'}
            {selectedParent && !isEditing && (
              <span className="text-sm font-normal text-gray-600 block">
                Under: {selectedParent.company_group_print_name}
              </span>
            )}
          </h2>
          <button 
            onClick={onCancel} 
            className="p-2 hover:bg-gray-100 rounded-lg" 
            aria-label="Close form"
          >
            <X />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name *</label>
              <input
                type="text"
                name="company_group_print_name"
                value={formData.company_group_print_name}
                onChange={onInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                aria-required="true"
                autoComplete="off"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                name="company_group_data_type"
                value={formData.company_group_data_type}
                onChange={onInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Company">Company</option>
                <option value="Group">Group</option>
                <option value="Division">Division</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Legal Name</label>
              <input
                type="text"
                name="legal_name"
                value={formData.legal_name}
                onChange={onInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="off"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Other Names</label>
              <input
                type="text"
                name="other_names"
                value={formData.other_names}
                onChange={onInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="off"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-3">Business Activities</label>
            <div className="grid grid-cols-3 gap-4">
              {businessActivities.map(activity => (
                <div key={activity} className="flex items-center">
                  <input
                    type="checkbox"
                    name={activity}
                    checked={formData[activity as keyof FormData] === 'Y'}
                    onChange={onInputChange}
                    className="mr-2"
                    id={`${activity}_checkbox`}
                  />
                  <label htmlFor={`${activity}_checkbox`} className="text-sm capitalize">
                    {activity.replace('_', ' ')}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              type="button"
            >
              <span className="inline-flex items-center">
                <Check />
                <span className="ml-2">{isEditing ? 'Update' : 'Create'}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
));

CompanyForm.displayName = 'CompanyForm';

const CompanyTree: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [selectedParent, setSelectedParent] = useState<Company | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormState);
  
  // SCROLL POSITION PRESERVATION - YE NAYE REFS HAIN
  const scrollPositionRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const preserveScrollRef = useRef<boolean>(false);

  // SCROLL POSITION SAVE KARNE KE LIYE
  const saveScrollPosition = useCallback(() => {
    scrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop;
    preserveScrollRef.current = true;
  }, []);

  // SCROLL POSITION RESTORE KARNE KE LIYE
  const restoreScrollPosition = useCallback(() => {
    if (preserveScrollRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        window.scrollTo({
          top: scrollPositionRef.current,
          behavior: 'auto'
        });
        preserveScrollRef.current = false;
      }, 50);
    }
  }, []);

  // Fetch company tree
  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/companies/tree`);
      if (!response.ok) {
        throw new Error(`Failed to fetch companies: ${response.statusText}`);
      }
      const data: Company[] = await response.json();
      console.log('API Response:', data);
      setCompanies(data || []);
      setError('');
      
      // SCROLL POSITION RESTORE KARNE KE LIYE
      restoreScrollPosition();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load companies: ${errorMessage}. Please try again.`);
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, [restoreScrollPosition]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

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

  // Handle form input changes - FIXED VERSION with useCallback
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const name = target.name;
    let value: string;

    if (target.type === 'checkbox') {
      const checkbox = target as HTMLInputElement;
      value = checkbox.checked ? 'Y' : 'N';
    } else {
      value = target.value;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Validate form before submission
  const validateForm = useCallback((): boolean => {
    if (!formData.company_group_print_name.trim()) {
      setError('Company name is required');
      return false;
    }
    return true;
  }, [formData.company_group_print_name]);

  // Create new company
  const handleCreateCompany = useCallback(async () => {
    if (!validateForm()) return;
    
    // SCROLL POSITION SAVE KARNE KE LIYE
    saveScrollPosition();
    
    try {
      const payload = { ...formData };
      if (selectedParent) {
        payload.parent_id = selectedParent.record_id;
      }

      console.log('Creating company with payload:', payload);

      let response;
      let endpoint = `${API_BASE}/companies`;
      
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (fetchError) {
        console.log(`Failed with ${endpoint}, trying alternative...`);
        endpoint = `${API_BASE}/companies/create`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', response.status, errorText);
        throw new Error(`Failed to create company: ${response.status} ${response.statusText}. Server response: ${errorText}`);
      }

      const result = await response.json();
      console.log('Company created successfully:', result);

      await fetchCompanies();
      setShowAddForm(false);
      setFormData(initialFormState);
      setSelectedParent(null);
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create company: ${errorMessage}`);
      console.error('Create company error:', err);
      preserveScrollRef.current = false; // Reset on error
    }
  }, [formData, selectedParent, validateForm, fetchCompanies, saveScrollPosition]);

  // Update company
  const handleUpdateCompany = useCallback(async () => {
    if (!validateForm() || !editingCompany) return;
    
    // SCROLL POSITION SAVE KARNE KE LIYE
    saveScrollPosition();
    
    try {
      const response = await fetch(`${API_BASE}/companies/${editingCompany.record_id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update company: ${response.status} ${response.statusText}. ${errorText}`);
      }

      await fetchCompanies();
      setEditingCompany(null);
      setFormData(initialFormState);
      setError('');
    } catch (err) {
      setError(`Failed to update company: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(err);
      preserveScrollRef.current = false; // Reset on error
    }
  }, [formData, editingCompany, validateForm, fetchCompanies, saveScrollPosition]);

  // Delete company
  const handleDeleteCompany = useCallback(async (companyId: string) => {
    if (!window.confirm('Are you sure? This will delete the company and all its children.')) return;

    // SCROLL POSITION SAVE KARNE KE LIYE
    saveScrollPosition();

    try {
      const response = await fetch(`${API_BASE}/companies/${companyId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete company: ${response.statusText}`);
      }

      await fetchCompanies();
      setError('');
    } catch (err) {
      setError(`Failed to delete company: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(err);
      preserveScrollRef.current = false; // Reset on error
    }
  }, [fetchCompanies, saveScrollPosition]);

  // Start editing a company
  const startEdit = useCallback((company: Company) => {
    setEditingCompany(company);
    setFormData({
      company_group_print_name: company.company_group_print_name,
      company_group_data_type: company.company_group_data_type,
      parent_id: company.parent_id,
      legal_name: company.legal_name || '',
      other_names: company.other_names || '',
      imports: company.imports || 'N',
      exports: company.exports || 'N',
      manufacture: company.manufacture || 'N',
      distribution: company.distribution || 'N',
      wholesale: company.wholesale || 'N',
      retail: company.retail || 'N',
      services: company.services || 'N',
      online: company.online || 'N',
      soft_products: company.soft_products || 'N'
    });
  }, []);

  // Add child company
  const addChild = useCallback((parentCompany: Company) => {
    setSelectedParent(parentCompany);
    setShowAddForm(true);
    setFormData(initialFormState);
  }, []);

  // Cancel form
  const handleCancel = useCallback(() => {
    setShowAddForm(false);
    setEditingCompany(null);
    setFormData(initialFormState);
    setSelectedParent(null);
    setError('');
    // Cancel pe scroll position preserve nahi karna
    preserveScrollRef.current = false;
  }, []);

  // Filter companies based on search term
  const filterCompanies = useCallback((companies: Company[], term: string): Company[] => {
    if (!term) return companies;
    const lowerTerm = term.toLowerCase();
    const filterNode = (company: Company): Company | null => {
      const matches = (
        company.company_group_print_name.toLowerCase().includes(lowerTerm) ||
        (company.legal_name && company.legal_name.toLowerCase().includes(lowerTerm)) ||
        (company.other_names && company.other_names.toLowerCase().includes(lowerTerm))
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

  // Memoized Company Node Component
  const CompanyNode = memo<CompanyNodeProps>(({ company, level = 0 }) => {
    const hasChildren = company.children && company.children.length > 0;
    const isExpanded = expandedNodes.has(company.record_id);
    const TypeIcon = companyTypes[company.company_group_data_type]?.icon || Building2;
    const typeConfig = companyTypes[company.company_group_data_type] || companyTypes['Company'];

    return (
      <div>
        <div 
          className={`flex items-center py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors ${level > 0 ? 'ml-6' : ''}`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleNode(company.record_id)}
              className="mr-2 p-1 hover:bg-gray-200 rounded transition-colors"
              aria-label={isExpanded ? `Collapse ${company.company_group_print_name}` : `Expand ${company.company_group_print_name}`}
            >
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
            </button>
          )}
          
          {!hasChildren && <div className="w-6 mr-2" />}
          
          <div className={`p-2 rounded-lg ${typeConfig.bgColor} mr-3`}>
            <TypeIcon />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-medium text-gray-900 truncate">
                  {company.company_group_print_name}
                </h3>
                <p className="text-sm text-gray-500">
                  {company.company_group_data_type} • ID: {company.record_id}
                </p>
                {company.legal_name && (
                  <p className="text-sm text-gray-600">Legal: {company.legal_name}</p>
                )}
              </div>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-1">
              {businessActivities.map(activity => (
                company[activity as keyof Company] === 'Y' && (
                  <span key={activity} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {activity.replace('_', ' ')}
                  </span>
                )
              ))}
            </div>
          </div>
          
          <div className="flex gap-1">
            <button
              onClick={() => addChild(company)}
              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
              aria-label={`Add child to ${company.company_group_print_name}`}
            >
              <Plus />
            </button>
            <button
              onClick={() => startEdit(company)}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
              aria-label={`Edit ${company.company_group_print_name}`}
            >
              <Edit />
            </button>
            <button
              onClick={() => handleDeleteCompany(company.record_id)}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              aria-label={`Delete ${company.company_group_print_name}`}
            >
              <Trash2 />
            </button>
          </div>
        </div>
        
        {hasChildren && isExpanded && company.children && (
          <div>
            {company.children.map(child => (
              <CompanyNode key={child.record_id} company={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  });

  CompanyNode.displayName = 'CompanyNode';

  const filteredCompanies = filterCompanies(companies, searchTerm);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div ref={containerRef} className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Company Management</h1>
            <button
              onClick={() => {
                setSelectedParent(null);
                setShowAddForm(true);
                setFormData(initialFormState);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus />
              Add Root Company
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={fetchCompanies}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Search />
            </div>
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search companies"
              autoComplete="off"
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border">
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="flex justify-center mb-4">
                <Building2 />
              </div>
              <p>{searchTerm ? 'No companies match your search.' : 'No companies found. Add your first company to get started.'}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredCompanies.map(company => (
                <CompanyNode key={company.record_id} company={company} />
              ))}
            </div>
          )}
        </div>
        
        {(showAddForm || editingCompany) && (
          <CompanyForm
            isEditing={!!editingCompany}
            onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany}
            onCancel={handleCancel}
            formData={formData}
            onInputChange={handleInputChange}
            selectedParent={selectedParent}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default CompanyTree;