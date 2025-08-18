import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/apiClient';

// Types
interface Industry {
  id: number;
  industry_name: string;
  category: string;
  parent_id: number | null;
  children?: Industry[];
}

interface CompanyFormData {
  // Company Type (first)
  company_group_data_type: 'Group' | 'Company' | 'Division';
  
  // Basic Information
  company_group_print_name: string;
  legal_name: string;
  other_names: string;
  parent_id: string | null;
  
  // Status & Details (one line)
  living_status: 'Active' | 'Inactive' | 'Dormant' | 'In Process';
  ownership_type: 'Individual' | 'Sole Proprietorship' | 'Association of Persons' | 'Public Limited Company' | 'Government' | 'Semi Government';
  global_operations: 'Local' | 'National' | 'Multi National';
  founding_year: string;
  established_day: string;
  established_month: string;
  company_size: number | null; // 1-5 scale
  ntn_no: string;
  website: string;
  
  
  // Operations
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
  
  // Industries (multi-select)
  selected_industries: number[];
  
  // Rating Fields (1-5 numeric input) - User will enter
  company_brand_image: number | null;
  company_business_volume: number | null;
  company_financials: number | null;
  iisol_relationship: number | null;
}

interface CompanyAddFormProps {
  initialData?: Partial<CompanyFormData>;
  onSubmit?: (data: CompanyFormData) => void;
  onCancel?: () => void;
}

const CompanyAddForm: React.FC<CompanyAddFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel 
}) => {
  const { theme } = useTheme();
  
  // Form State
  const [formData, setFormData] = useState<CompanyFormData>({
    company_group_data_type: 'Company',
    company_group_print_name: '',
    legal_name: '',
    other_names: '',
    parent_id: null,
    living_status: 'Active',
    ownership_type: 'Individual',
    global_operations: 'Local',
    founding_year: '',
    established_day: '',
    established_month: '',
    company_size: null,
    ntn_no: '',
    website: '',
    operations: {
      imports: false,
      exports: false,
      manufacture: false,
      distribution: false,
      wholesale: false,
      retail: false,
      services: false,
      online: false,
      soft_products: false,
    },
    selected_industries: [],
    company_brand_image: null,
    company_business_volume: null,
    company_financials: null,
    iisol_relationship: null,
    ...initialData
  });
  
  // State for dropdowns and data
  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Industry selection state
  const [industrySearch, setIndustrySearch] = useState('');
  const [isIndustryModalOpen, setIsIndustryModalOpen] = useState(false);
  const [selectedMainIndustry, setSelectedMainIndustry] = useState<Industry | null>(null);
  const [selectedSubIndustry, setSelectedSubIndustry] = useState<Industry | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Load initial data
  useEffect(() => {
    loadIndustries();
    loadCompanies();
  }, []);

  // Cleanup effect for modal
  useEffect(() => {
    return () => {
      // Restore body scroll when component unmounts
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isIndustryModalOpen) {
        closeIndustryModal();
      }
    };

    if (isIndustryModalOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isIndustryModalOpen]);

  // Maintain search input focus after state updates
  useEffect(() => {
    if (isIndustryModalOpen && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [industrySearch, isIndustryModalOpen]);

  // Load industries
  const loadIndustries = async () => {
    try {
      const response = await apiClient.get('/industries/');
      if (response.ok) {
        const data = await response.json();
        setAllIndustries(data);
      } else {
        console.error('Failed to load industries - response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load industries:', error);
    }
  };

  // Load companies for parent selection
  const loadCompanies = async () => {
    try {
      const response = await apiClient.get('/companies/');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  // Handle form field changes
  const handleInputChange = (field: keyof CompanyFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle operations change
  const handleOperationChange = (operation: keyof CompanyFormData['operations'], checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      operations: {
        ...prev.operations,
        [operation]: checked
      }
    }));
  };

  // Get main industries (parent_id is null)
  const getMainIndustries = () => {
    return allIndustries.filter(industry => industry.parent_id === null);
  };

  // Get sub industries for a main industry
  const getSubIndustries = (mainIndustryId: number) => {
    return allIndustries.filter(industry => industry.parent_id === mainIndustryId);
  };

  // Get sub-sub industries for a sub industry
  const getSubSubIndustries = (subIndustryId: number) => {
    return allIndustries.filter(industry => industry.parent_id === subIndustryId);
  };

  // Filter industries based on search
  const filterIndustriesBySearch = (industries: Industry[], searchTerm: string): Industry[] => {
    if (!searchTerm) return industries;
    return industries.filter(industry => 
      industry.industry_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Get all parent industry IDs for a given industry
  const getParentIndustryIds = (industryId: number): number[] => {
    const industry = allIndustries.find(i => i.id === industryId);
    if (!industry || !industry.parent_id) return [];
    
    const parentIds = [industry.parent_id];
    const parentParentIds = getParentIndustryIds(industry.parent_id);
    return [...parentIds, ...parentParentIds];
  };

  // Get all child industry IDs for a given industry (for deselection)
  const getAllChildIndustryIds = (industryId: number): number[] => {
    const childIds: number[] = [];
    const directChildren = allIndustries.filter(i => i.parent_id === industryId);
    
    directChildren.forEach(child => {
      childIds.push(child.id);
      childIds.push(...getAllChildIndustryIds(child.id));
    });
    
    return childIds;
  };

  // Handle industry selection/deselection with auto-parent selection
  const toggleIndustrySelection = (industryId: number) => {
    setFormData(prev => {
      const isCurrentlySelected = prev.selected_industries.includes(industryId);
      
      if (isCurrentlySelected) {
        // Deselecting - remove this industry and its children
        const childIds = getAllChildIndustryIds(industryId);
        return {
          ...prev,
          selected_industries: prev.selected_industries.filter(id => 
            id !== industryId && !childIds.includes(id)
          )
        };
      } else {
        // Selecting - add this industry and its parents
        const parentIds = getParentIndustryIds(industryId);
        const allIdsToAdd = [industryId, ...parentIds];
        const uniqueIds = [...new Set([...prev.selected_industries, ...allIdsToAdd])];
        
        return {
          ...prev,
          selected_industries: uniqueIds
        };
      }
    });
    
    // Maintain search focus
    if (searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  };

  // Handle main industry selection for navigation
  const handleMainIndustrySelect = (industry: Industry) => {
    setSelectedMainIndustry(industry);
    setSelectedSubIndustry(null);
  };

  // Handle sub industry selection for navigation
  const handleSubIndustrySelect = (industry: Industry) => {
    setSelectedSubIndustry(industry);
  };

  // Reset modal state when opening
  const openIndustryModal = () => {
    setIsIndustryModalOpen(true);
    setIndustrySearch('');
    setSelectedMainIndustry(null);
    setSelectedSubIndustry(null);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  };

  // Close modal and restore body scroll
  const closeIndustryModal = () => {
    setIsIndustryModalOpen(false);
    document.body.style.overflow = 'unset';
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_group_print_name.trim()) {
      newErrors.company_group_print_name = 'Print name is required';
    }

    if (!formData.legal_name.trim()) {
      newErrors.legal_name = 'Legal name is required';
    }

    if (formData.founding_year && (parseInt(formData.founding_year) < 1800 || parseInt(formData.founding_year) > new Date().getFullYear())) {
      newErrors.founding_year = 'Please enter a valid founding year';
    }

    if (formData.established_date && new Date(formData.established_date) > new Date()) {
      newErrors.established_date = 'Established date cannot be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get company type options
  const getCompanyTypeOptions = () => {
    const options = [
      { value: 'Company', label: 'Company', icon: '🏢' },
      { value: 'Group', label: 'Group', icon: '🏭' },
      { value: 'Division', label: 'Division', icon: '🏪' }
    ];
    return options;
  };

  // Get ownership type options
  const getOwnershipTypeOptions = () => [
    { value: 'Individual', label: 'Individual', icon: '👤', description: 'Single person ownership' },
    { value: 'Sole Proprietorship', label: 'Sole Proprietorship', icon: '🏪', description: 'Single owner business' },
    { value: 'Association of Persons', label: 'Association of Persons', icon: '👥', description: 'Group of individuals' },
    { value: 'Public Limited Company', label: 'Public Limited Company', icon: '🏢', description: 'Publicly traded company' },
    { value: 'Government', label: 'Government', icon: '🏛️', description: 'Government owned' },
    { value: 'Semi Government', label: 'Semi Government', icon: '🏤', description: 'Semi-government entity' }
  ];

  // Get global operations options
  const getGlobalOperationsOptions = () => [
    { value: 'Local', label: 'Local', icon: '🏘️', description: 'Local operations only' },
    { value: 'National', label: 'National', icon: '🗺️', description: 'Nationwide operations' },
    { value: 'Multi National', label: 'Multi National', icon: '🌍', description: 'International operations' }
  ];

  // Get rating options
  const getRatingOptions = () => [
    { value: 5, label: 'Excellent', icon: '⭐', color: 'emerald', description: 'Outstanding performance' },
    { value: 4, label: 'Good', icon: '✨', color: 'blue', description: 'Above average performance' },
    { value: 3, label: 'Fair', icon: '⚡', color: 'yellow', description: 'Average performance' },
    { value: 2, label: 'Unknown', icon: '❓', color: 'gray', description: 'Performance unknown' },
    { value: 1, label: 'Bad', icon: '⚠️', color: 'orange', description: 'Below average performance' },
    { value: 0, label: 'Very Bad', icon: '❌', color: 'red', description: 'Poor performance' }
  ];

  // Rating component
  const RatingSelector: React.FC<{
    title: string;
    description: string;
    value: number;
    onChange: (value: number) => void;
    icon?: string;
  }> = ({ title, description, value, onChange, icon = '⭐' }) => {
    const options = getRatingOptions();
    
    return (
      <div>
        <label className={`block text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
          <span className="flex items-center gap-2">
            <span>{icon}</span>
            <span>{title}</span>
          </span>
        </label>
        <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {description}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                value === option.value
                  ? option.color === 'emerald' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : option.color === 'blue' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : option.color === 'yellow' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  : option.color === 'gray' ? 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
                  : option.color === 'orange' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : theme === 'dark'
                  ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-lg">{option.icon}</span>
                  <span className="text-xl font-bold">{option.value}</span>
                </div>
                <span className={`text-xs font-medium text-center ${
                  value === option.value
                    ? option.color === 'emerald' ? 'text-emerald-700 dark:text-emerald-300'
                    : option.color === 'blue' ? 'text-blue-700 dark:text-blue-300'
                    : option.color === 'yellow' ? 'text-yellow-700 dark:text-yellow-300'
                    : option.color === 'gray' ? 'text-gray-700 dark:text-gray-300'
                    : option.color === 'orange' ? 'text-orange-700 dark:text-orange-300'
                    : 'text-red-700 dark:text-red-300'
                    : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {option.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Industry Selection Modal Component
  const IndustrySelectionModal = () => {
    if (!isIndustryModalOpen) return null;

    try {
      const mainIndustries = filterIndustriesBySearch(getMainIndustries(), industrySearch);
      const subIndustries = selectedMainIndustry ? filterIndustriesBySearch(getSubIndustries(selectedMainIndustry.id), industrySearch) : [];
      const subSubIndustries = selectedSubIndustry ? filterIndustriesBySearch(getSubSubIndustries(selectedSubIndustry.id), industrySearch) : [];

      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={closeIndustryModal}
          />
          
          <div className={`relative w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col ${
            theme === 'dark' ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                  Select Industries
                </h2>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Selected: {formData.selected_industries.length} industries
                </p>
              </div>
              <button
                onClick={closeIndustryModal}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="p-4 border-b">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search industries..."
                  value={industrySearch}
                  onChange={(e) => {
                    setIndustrySearch(e.target.value);
                  }}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>
            
            {/* Three Column Layout */}
            <div className="flex-1 flex min-h-0">
              {/* Main Industries Column */}
              <div className="w-1/3 border-r flex flex-col">
                <div className={`px-4 py-3 border-b font-medium ${
                  theme === 'dark' ? 'text-gray-200 border-gray-600' : 'text-gray-800 border-gray-200'
                }`}>
                  Main Industries ({mainIndustries.length})
                </div>
                <div className="flex-1 overflow-y-auto">
                  {mainIndustries.map(industry => (
                    <div
                      key={industry.id}
                      className={`p-3 border-b cursor-pointer transition-colors ${
                        selectedMainIndustry?.id === industry.id
                          ? theme === 'dark' ? 'bg-blue-900/50 border-blue-600' : 'bg-blue-50 border-blue-200'
                          : theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleMainIndustrySelect(industry)}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.selected_industries.includes(industry.id)}
                          onChange={() => toggleIndustrySelection(industry.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate ${
                            theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                          }`}>
                            {industry.industry_name}
                          </div>
                          <div className={`text-xs truncate ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {industry.category}
                          </div>
                        </div>
                        {getSubIndustries(industry.id).length > 0 && (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub Industries Column */}
              <div className="w-1/3 border-r flex flex-col">
                <div className={`px-4 py-3 border-b font-medium ${
                  theme === 'dark' ? 'text-gray-200 border-gray-600' : 'text-gray-800 border-gray-200'
                }`}>
                  Sub Industries ({subIndustries.length})
                  {selectedMainIndustry && (
                    <div className={`text-xs font-normal mt-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Under: {selectedMainIndustry.industry_name}
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {selectedMainIndustry ? (
                    subIndustries.length > 0 ? (
                      subIndustries.map(industry => (
                        <div
                          key={industry.id}
                          className={`p-3 border-b cursor-pointer transition-colors ${
                            selectedSubIndustry?.id === industry.id
                              ? theme === 'dark' ? 'bg-blue-900/50 border-blue-600' : 'bg-blue-50 border-blue-200'
                              : theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => handleSubIndustrySelect(industry)}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={formData.selected_industries.includes(industry.id)}
                              onChange={() => toggleIndustrySelection(industry.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium truncate ${
                                theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                              }`}>
                                {industry.industry_name}
                              </div>
                              <div className={`text-xs truncate ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {industry.category}
                              </div>
                            </div>
                            {getSubSubIndustries(industry.id).length > 0 && (
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`p-4 text-center ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        No sub-industries available
                      </div>
                    )
                  ) : (
                    <div className={`p-4 text-center ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Select a main industry to view sub-industries
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-Sub Industries Column */}
              <div className="w-1/3 flex flex-col">
                <div className={`px-4 py-3 border-b font-medium ${
                  theme === 'dark' ? 'text-gray-200 border-gray-600' : 'text-gray-800 border-gray-200'
                }`}>
                  Sub-Sub Industries ({subSubIndustries.length})
                  {selectedSubIndustry && (
                    <div className={`text-xs font-normal mt-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Under: {selectedSubIndustry.industry_name}
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {selectedSubIndustry ? (
                    subSubIndustries.length > 0 ? (
                      subSubIndustries.map(industry => (
                        <div
                          key={industry.id}
                          className={`p-3 border-b transition-colors ${
                            theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={formData.selected_industries.includes(industry.id)}
                              onChange={() => toggleIndustrySelection(industry.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium truncate ${
                                theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                              }`}>
                                {industry.industry_name}
                              </div>
                              <div className={`text-xs truncate ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {industry.category}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`p-4 text-center ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        No sub-sub industries available
                      </div>
                    )
                  ) : (
                    <div className={`p-4 text-center ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Select a sub-industry to view sub-sub industries
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t">
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {formData.selected_industries.length} industries selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeIndustryModal}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Modal rendering error:', error);
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="bg-red-500 text-white p-6 rounded-lg">
            <h3 className="font-bold mb-2">Modal Error</h3>
            <p>Error rendering modal: {error instanceof Error ? error.message : 'Unknown error'}</p>
            <button
              onClick={closeIndustryModal}
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className={`w-full max-w-none mx-auto p-3 text-xs ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Compact Header */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg text-white">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h1 className="text-lg font-bold">Add New Company</h1>
          </div>
        </div>

        {/* Company Type Selection - First */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <label className="block text-xs font-medium mb-1">Company Type</label>
          <div className="flex gap-1">
            {getCompanyTypeOptions().map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleInputChange('company_group_data_type', option.value)}
                className={`flex-1 px-2 py-1 rounded text-[10px] transition-colors ${
                  formData.company_group_data_type === option.value
                    ? 'bg-blue-500 text-white'
                    : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.icon} {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Basic Information - One Row */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-xs font-medium mb-1">Basic Information</h3>
          <div className={`grid gap-2 ${
            formData.company_group_data_type === 'Group' ? 'grid-cols-3' : 'grid-cols-4'
          }`}>
            <div>
              <label className="block text-[10px] mb-1">
                {formData.company_group_data_type === 'Group' ? 'Group Print Name *' : 
                 formData.company_group_data_type === 'Division' ? 'Division Print Name *' : 
                 'Company Print Name *'}
              </label>
              <input
                type="text"
                value={formData.company_group_print_name}
                onChange={(e) => handleInputChange('company_group_print_name', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-[10px] ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                placeholder="Print name"
              />
              {errors.company_group_print_name && <p className="text-[8px] text-red-500">{errors.company_group_print_name}</p>}
            </div>
            <div>
              <label className="block text-[10px] mb-1">Legal Name *</label>
              <input
                type="text"
                value={formData.legal_name}
                onChange={(e) => handleInputChange('legal_name', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-[10px] ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                placeholder="Legal name"
              />
              {errors.legal_name && <p className="text-[8px] text-red-500">{errors.legal_name}</p>}
            </div>
            <div>
              <label className="block text-[10px] mb-1">Other Names</label>
              <input
                type="text"
                value={formData.other_names}
                onChange={(e) => handleInputChange('other_names', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-[10px] ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                placeholder="Other names"
              />
            </div>
            {formData.company_group_data_type !== 'Group' && (
              <div>
                <label className="block text-[10px] mb-1">
                  {formData.company_group_data_type === 'Company' ? 'Parent Group' : 'Parent Company'}
                </label>
                <select
                  value={formData.parent_id || ''}
                  onChange={(e) => handleInputChange('parent_id', e.target.value || null)}
                  className={`w-full px-2 py-1 rounded border text-[10px] ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">None</option>
                  {companies
                    .filter((company) => {
                      // When adding Company, show only Groups
                      if (formData.company_group_data_type === 'Company') {
                        return company.company_group_data_type === 'Group';
                      }
                      // When adding Division, show only Companies
                      if (formData.company_group_data_type === 'Division') {
                        return company.company_group_data_type === 'Company';
                      }
                      return false;
                    })
                    .map((company) => (
                      <option key={company.record_id} value={company.record_id}>
                        {company.company_group_print_name} ({company.company_group_data_type})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Status & Details - One Row */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-xs font-medium mb-1">Status & Details</h3>
          <div className={`grid gap-2 ${
            formData.company_group_data_type === 'Company' ? 'grid-cols-7' : 'grid-cols-1'
          }`}>
            <div>
              <label className="block text-[10px] mb-1">Living Status</label>
              <select
                value={formData.living_status}
                onChange={(e) => handleInputChange('living_status', e.target.value)}
                className={`w-full px-1 py-1 rounded border text-[10px] ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Dormant">Dormant</option>
                <option value="In Process">In Process</option>
              </select>
            </div>
            {formData.company_group_data_type === 'Company' && (
              <>
                <div>
                  <label className="block text-[10px] mb-1">Ownership</label>
                  <select
                    value={formData.ownership_type}
                    onChange={(e) => handleInputChange('ownership_type', e.target.value)}
                    className={`w-full px-1 py-1 rounded border text-[10px] ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="Individual">Individual</option>
                    <option value="Sole Proprietorship">Sole Prop.</option>
                    <option value="Association of Persons">AOP</option>
                    <option value="Public Limited Company">Public Ltd</option>
                    <option value="Government">Govt</option>
                    <option value="Semi Government">Semi Govt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] mb-1">Global Ops</label>
                  <select
                    value={formData.global_operations}
                    onChange={(e) => handleInputChange('global_operations', e.target.value)}
                    className={`w-full px-1 py-1 rounded border text-[10px] ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="Local">Local</option>
                    <option value="National">National</option>
                    <option value="Multi National">Multi National</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] mb-1">Founded Year</label>
                  <input
                    type="number"
                    value={formData.founding_year}
                    onChange={(e) => handleInputChange('founding_year', e.target.value)}
                    className={`w-full px-1 py-1 rounded border text-[10px] ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                    }`}
                    placeholder="2020"
                    min="1800"
                    max={new Date().getFullYear()}
                  />
                </div>
                <div>
                  <label className="block text-[10px] mb-1">Established Day</label>
                  <input
                    type="number"
                    value={formData.established_day}
                    onChange={(e) => handleInputChange('established_day', e.target.value)}
                    className={`w-full px-1 py-1 rounded border text-[10px] ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                    }`}
                    placeholder="1-31"
                    min="1"
                    max="31"
                  />
                </div>
                <div>
                  <label className="block text-[10px] mb-1">Established Month</label>
                  <select
                    value={formData.established_month}
                    onChange={(e) => handleInputChange('established_month', e.target.value)}
                    className={`w-full px-1 py-1 rounded border text-[10px] ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="">Select Month</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] mb-1">Company Size (1-5)</label>
                  <input
                    type="number"
                    value={formData.company_size || ''}
                    onChange={(e) => handleInputChange('company_size', e.target.value ? parseInt(e.target.value) : null)}
                    className={`w-full px-1 py-1 rounded border text-[10px] ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                    }`}
                    min="1"
                    max="5"
                    placeholder="1-5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] mb-1">NTN Number</label>
                  <input
                    type="text"
                    value={formData.ntn_no}
                    onChange={(e) => handleInputChange('ntn_no', e.target.value)}
                    className={`w-full px-1 py-1 rounded border text-[10px] ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                    }`}
                    placeholder="NTN"
                  />
                </div>
                <div>
                  <label className="block text-[10px] mb-1">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className={`w-full px-1 py-1 rounded border text-[10px] ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                    }`}
                    placeholder="https://example.com"
                  />
                </div>
              </>
            )}
          </div>
        </div>


        {/* Show additional sections only for Company type */}
        {formData.company_group_data_type === 'Company' && (
          <>
            {/* Business Operations - Checkboxes in One Row */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-xs font-medium mb-1">Business Operations</h3>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(formData.operations).map(([key, value]) => (
              <label key={key} className="flex items-center gap-1 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => handleOperationChange(key as keyof CompanyFormData['operations'], e.target.checked)}
                  className="w-3 h-3"
                />
                <span className="capitalize">{key.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Industry Classification - Compact */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-xs font-medium mb-1">Industry Classification</h3>
          <div className="flex items-center gap-2">
            {formData.selected_industries.length > 0 && (
              <div className="flex flex-wrap gap-1 flex-1">
                {formData.selected_industries.slice(0, 3).map(industryId => {
                  const industry = allIndustries.find(i => i.id === industryId);
                  return industry ? (
                    <span key={industryId} className={`px-1 py-0.5 rounded text-[8px] ${
                      theme === 'dark' ? 'bg-blue-900/50 text-blue-200' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {industry.industry_name}
                    </span>
                  ) : null;
                })}
                {formData.selected_industries.length > 3 && (
                  <span className="text-[8px] text-gray-500">+{formData.selected_industries.length - 3} more</span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={openIndustryModal}
              className={`px-2 py-1 rounded border text-[10px] transition-colors ${
                theme === 'dark' 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {formData.selected_industries.length === 0 ? 'Select Industries' : 'Edit Industries'}
            </button>
          </div>
        </div>

        {/* Company Assessments - Number Inputs in One Row */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-xs font-medium mb-1">Company Assessments & Ratings (1-5)</h3>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] mb-1">🏆 Brand Image</label>
              <input
                type="number"
                value={formData.company_brand_image || ''}
                onChange={(e) => handleInputChange('company_brand_image', e.target.value ? parseInt(e.target.value) : null)}
                className={`w-full px-1 py-1 rounded border text-[10px] ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                min="1"
                max="5"
                placeholder="1-5"
              />
            </div>
            <div>
              <label className="block text-[10px] mb-1">📈 Business Volume</label>
              <input
                type="number"
                value={formData.company_business_volume || ''}
                onChange={(e) => handleInputChange('company_business_volume', e.target.value ? parseInt(e.target.value) : null)}
                className={`w-full px-1 py-1 rounded border text-[10px] ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                min="1"
                max="5"
                placeholder="1-5"
              />
            </div>
            <div>
              <label className="block text-[10px] mb-1">💰 Financials</label>
              <input
                type="number"
                value={formData.company_financials || ''}
                onChange={(e) => handleInputChange('company_financials', e.target.value ? parseInt(e.target.value) : null)}
                className={`w-full px-1 py-1 rounded border text-[10px] ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                min="1"
                max="5"
                placeholder="1-5"
              />
            </div>
            <div>
              <label className="block text-[10px] mb-1">🤝 IISOL Relationship</label>
              <input
                type="number"
                value={formData.iisol_relationship || ''}
                onChange={(e) => handleInputChange('iisol_relationship', e.target.value ? parseInt(e.target.value) : null)}
                className={`w-full px-1 py-1 rounded border text-[10px] ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                min="1"
                max="5"
                placeholder="1-5"
              />
            </div>
          </div>
        </div>

          </>
        )}

        {/* Form Actions - Bottom */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {loading ? 'Saving...' : `Save ${formData.company_group_data_type}`}
          </button>
        </div>
      </form>
      
      {/* Industry Selection Modal */}
      <IndustrySelectionModal />
    </div>
  );
};

export default CompanyAddForm;
