import React, { useState, useEffect, useRef } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/apiClient';

// Location form data interface
interface LocationFormData {
  location_name: string;
  address?: string;
  description?: string;
}

// Association interface
interface LocationAssociation {
  association_id?: number;
  company_id?: number;
  departments?: string[];
  person_id?: number;
}

// Company interface for modal
interface Company {
  record_id: number;
  uid?: string;
  company_group_print_name: string;
  company_group_data_type: 'Company' | 'Group' | 'Division';
  living_status?: string;
}

// Person interface for modal
interface Person {
  record_id: number;
  person_print_name: string;
  full_name: string;
  living_status: string;
}

// Props interface
interface LocationAddFormProps {
  initialData?: Partial<LocationFormData>;
  initialAssociations?: LocationAssociation[];
  onSubmit?: (data: LocationFormData, associations: LocationAssociation[]) => void;
  onCancel?: () => void;
  onChange?: () => void;
  loading?: boolean;
  isEditMode?: boolean;
  companyLookup?: {[key: number]: string};
  personLookup?: {[key: number]: string};
}


// Departments (matching backend enum)
const DEPARTMENTS = [
  'Board Member', 'Management All', 'Management Operations', 'Management Administration',
  'Engineering Department', 'Research & Development', 'Regulatory & Legal', 'Quality Control',
  'Human Resource', 'Training & Development', 'Purchase & Procurement', 'Logistics & Distribution',
  'Finance & Accounts', 'Audit Department', 'Information Technology', 'Creative Department',
  'Customer Support', 'Sales & Support', 'Marketing & Sales', 'Marketing & Planning',
  'Marketing & Digital', 'eCommerce Department', 'PR Department', 'Editorial Department',
  'Import Export', 'Protocol & Security', 'Examination Department', 'Academics Department',
  'Admissions Department'
];

const LocationAddForm: React.FC<LocationAddFormProps> = ({
  initialData = {},
  initialAssociations = [],
  onSubmit,
  onCancel,
  onChange,
  loading = false,
  isEditMode = false,
  companyLookup = {},
  personLookup = {},
}) => {
  const { theme } = useTheme();
  const { navigateWithConfirm, setUnsavedChanges } = useNavigation();

  // Form data state
  const [formData, setFormData] = useState<LocationFormData>(() => ({
    location_name: '',
    address: undefined,
    description: undefined,
    ...initialData,
  }));

  // Associations state
  const [associations, setAssociations] = useState<LocationAssociation[]>(() => initialAssociations || []);

  // Modal states
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [modalStep, setModalStep] = useState<'company' | 'department'>('company');
  const [showPersonModal, setShowPersonModal] = useState(false);

  // Company modal states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [selectedCompanyForDept, setSelectedCompanyForDept] = useState<Company | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [departmentSearch, setDepartmentSearch] = useState('');

  // Person modal states
  const [persons, setPersons] = useState<Person[]>([]);
  const [personsLoading, setPersonsLoading] = useState(false);
  const [personsError, setPersonsError] = useState<string | null>(null);
  const [personSearch, setPersonSearch] = useState('');

  // Simple change tracking
  const [hasChangedOnce, setHasChangedOnce] = useState(false);

  // Load companies - show recent 12 companies if no search term, search all when searching
  const loadCompanies = async (search: string = '') => {
    setCompaniesLoading(true);
    setCompaniesError(null);
    try {
      let response;
      if (search.trim()) {
        // If search term provided, search from all companies in database
        response = await apiClient.get(`/companies/search?q=${encodeURIComponent(search)}`);
      } else {
        // If no search term, get all companies and take last 12
        response = await apiClient.get('/companies/all');
      }
      
      if (response.ok) {
        const responseData = await response.json();
        // Filter to only show companies (not groups or divisions)
        let companyData = responseData.filter((item: Company) => 
          item.company_group_data_type === 'Company'
        );
        
        // If no search term, limit to last 12 companies (4x3 grid)
        if (!search.trim()) {
          companyData = companyData.slice(-12).reverse(); // Last 12, most recent first
        }
        
        setCompanies(companyData);
        setCompaniesError(null);
      } else {
        const errorMsg = `Error ${response.status}: Unable to load companies`;
        console.error('Companies API error:', response.status, response.statusText);
        setCompaniesError(errorMsg);
        setCompanies([]);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      setCompaniesError('Network error: Unable to connect to server');
      setCompanies([]);
    } finally {
      setCompaniesLoading(false);
    }
  };

  // Load persons - show recent 12 persons if no search term, search all when searching (even single character)
  const loadPersons = async (search: string = '') => {
    setPersonsLoading(true);
    setPersonsError(null);
    try {
      let response;
      const trimmedSearch = search.trim();
      
      if (trimmedSearch.length >= 2) {
        // If search term is 2+ characters, use search API
        response = await apiClient.get(`/persons/search?q=${encodeURIComponent(trimmedSearch)}`);
      } else {
        // For single character or no search, get all persons and filter client-side
        response = await apiClient.get('/persons/all');
      }
      
      if (response.ok) {
        const responseData = await response.json();
        
        if (trimmedSearch.length === 0) {
          // No search term, show last 12 persons (4x3 grid)
          const personData = responseData.slice(-12).reverse(); // Last 12, most recent first
          setPersons(personData);
        } else if (trimmedSearch.length === 1) {
          // Single character search - filter all persons client-side
          const filteredPersons = responseData.filter((person: any) => 
            person.person_print_name?.toLowerCase().includes(trimmedSearch.toLowerCase()) ||
            person.full_name?.toLowerCase().includes(trimmedSearch.toLowerCase())
          );
          setPersons(filteredPersons.slice(0, 12)); // Limit to first 12 for grid
        } else {
          // 2+ character search results from API
          setPersons(responseData.slice(0, 12));
        }
        setPersonsError(null);
      } else {
        const errorMsg = `Error ${response.status}: Unable to load persons`;
        console.error('Persons API error:', response.status, response.statusText);
        setPersonsError(errorMsg);
        setPersons([]);
      }
    } catch (error) {
      console.error('Error loading persons:', error);
      setPersonsError('Network error: Unable to connect to server');
      setPersons([]);
    } finally {
      setPersonsLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (field: keyof LocationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (!hasChangedOnce) {
      setHasChangedOnce(true);
      if (onChange) {
        onChange();
      }
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      // Reset the changed flag since user is submitting (saving changes)
      setHasChangedOnce(false);
      onSubmit(formData, associations);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigateWithConfirm('/locations');
    }
  };


  const filteredCompanies = companySearch.trim() 
    ? companies.filter(company =>
        company.company_group_print_name.toLowerCase().includes(companySearch.toLowerCase())
      )
    : companies;

  // Person association functions
  const addPersonAssociation = (person: Person) => {
    const newAssociation: LocationAssociation = {
      person_id: person.record_id
    };
    
    setAssociations(prev => [...prev, newAssociation]);
    setShowPersonModal(false);
    
    if (!hasChangedOnce) {
      setHasChangedOnce(true);
      onChange();
    }
  };

  const removeAssociation = (index: number) => {
    setAssociations(prev => prev.filter((_, i) => i !== index));
    
    if (!hasChangedOnce) {
      setHasChangedOnce(true);
      onChange();
    }
  };

  // Filter associations
  const companyAssociations = associations.filter(assoc => assoc.company_id);
  const personAssociations = associations.filter(assoc => assoc.person_id);

  const hasCompanyAssociations = companyAssociations.length > 0;
  const hasPersonAssociations = personAssociations.length > 0;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Form Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {isEditMode ? 'Edit Location' : 'Add New Location'}
          </h2>
        </div>

        {/* Location Information */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-sm font-medium mb-1">Location Information</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1">Location Name *</label>
              <input
                type="text"
                value={formData.location_name}
                onChange={(e) => handleInputChange('location_name', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                placeholder="e.g., Main Office, Warehouse"
                required
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Address</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                placeholder="e.g., 123 Main St, Karachi"
              />
            </div>
          </div>
          <div className="mt-2">
            <label className="block text-xs mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`w-full px-2 py-1 rounded border text-xs ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
              }`}
              placeholder="Optional description of the location"
              rows={2}
            />
          </div>
        </div>

        {/* Associations Section */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium">Location Associations</h3>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  loadCompanies();
                  setSelectedDepartments([]);
                  setSelectedCompanyForDept(null);
                  setModalStep('company');
                  setShowCompanyModal(true);
                }}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-md min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="hidden sm:inline">Add Company</span>
                <span className="sm:hidden">Company</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  loadPersons(); // Load recent 12 persons
                  setShowPersonModal(true);
                }}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-md min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden sm:inline">Add Person</span>
                <span className="sm:hidden">Person</span>
              </button>
            </div>
          </div>

          {/* Associations Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
            {/* Companies Column */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 border-b border-blue-200 dark:border-blue-700 pb-2">
                🏢 Companies ({companyAssociations.length})
              </h4>
              {hasCompanyAssociations ? (
                companyAssociations
                  .map((assoc, idx) => {
                    const companyName = companyLookup[assoc.company_id!] || `Company ${assoc.company_id}`;
                    const originalIndex = associations.findIndex(a => a === assoc);
                    
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded border ${theme === 'dark' ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-300'} relative group`}
                      >
                        <button
                          type="button"
                          onClick={() => removeAssociation(originalIndex)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity"
                          title="Remove association"
                        >
                          ×
                        </button>
                        <div className="pr-6">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400 flex-shrink-0">
                              🏢
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate">{companyName}</div>
                              {assoc.departments && assoc.departments.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {assoc.departments.map((dept, deptIdx) => (
                                    <span
                                      key={`${idx}-${deptIdx}`}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'}`}
                                    >
                                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                      {dept}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs">
                  No company associations yet
                </div>
              )}
            </div>

            {/* Persons Column */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 border-b border-purple-200 dark:border-purple-700 pb-2">
                👤 Persons ({personAssociations.length})
              </h4>
              {hasPersonAssociations ? (
                personAssociations.map((assoc, index) => {
                  const originalIndex = associations.findIndex(a => a === assoc);
                  const personName = personLookup[assoc.person_id!] || `Person ${assoc.person_id}`;
                  
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded border ${theme === 'dark' ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-300'} relative group`}
                    >
                      <button
                        type="button"
                        onClick={() => removeAssociation(originalIndex)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity"
                        title="Remove association"
                      >
                        ×
                      </button>
                      <div className="pr-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-xs font-semibold text-purple-600 dark:text-purple-400 flex-shrink-0">
                            👤
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-purple-700 dark:text-purple-300 truncate">{personName}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs">
                  No person associations yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] flex items-center justify-center ${
              loading 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isEditMode ? 'Update Location' : 'Create Location'}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] flex items-center justify-center ${
              theme === 'dark' 
                ? 'bg-gray-600 hover:bg-gray-700 text-gray-100' 
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Company Selection Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
          <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg w-full max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300`}>
            <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex-shrink-0">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {modalStep === 'company' ? (
                  <>
                    <span className="hidden sm:inline">🏢 Step 1: Select Company</span>
                    <span className="sm:hidden">Step 1</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">🏷️ Step 2: Select Departments</span>
                    <span className="sm:hidden">Step 2</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setSelectedDepartments([]);
                  setSelectedCompanyForDept(null);
                  setModalStep('company');
                  setShowCompanyModal(false);
                }}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {modalStep === 'company' ? (
              /* STEP 1: Company Selection */
              <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Search & Select Company</label>
                    <input
                      type="text"
                      placeholder="Search companies..."
                      value={companySearch}
                      onChange={(e) => {
                        setCompanySearch(e.target.value);
                        loadCompanies(e.target.value);
                      }}
                      className={`w-full px-3 py-2 border rounded-lg text-sm mb-3 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                    
                    <div className="border rounded p-3">
                      {companiesLoading ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm">Loading companies...</span>
                          </div>
                        </div>
                      ) : companiesError ? (
                        <div className="text-center py-8">
                          <div className="text-red-500 text-sm mb-2">{companiesError}</div>
                          <button
                            onClick={() => loadCompanies(companySearch)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Try again
                          </button>
                        </div>
                      ) : companies.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-sm">No companies found</div>
                          {companySearch && (
                            <div className="text-xs text-gray-400 mt-1">Try a different search term</div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-3">
                          {companies.slice(0, 12).map((company) => {
                            const isSelected = selectedCompanyForDept?.record_id === company.record_id;
                            return (
                              <div
                                key={company.record_id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  isSelected
                                    ? theme === 'dark' 
                                      ? 'bg-blue-900/30 border-blue-600'
                                      : 'bg-blue-50 border-blue-300'
                                    : theme === 'dark' 
                                      ? 'hover:bg-gray-700 border-gray-600'
                                      : 'hover:bg-blue-50 border-gray-200'
                                } min-h-[70px] flex flex-col justify-between`}
                                onClick={() => setSelectedCompanyForDept(company)}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    isSelected 
                                      ? 'bg-blue-500 border-blue-500' 
                                      : theme === 'dark' ? 'border-gray-400' : 'border-gray-300'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium leading-tight break-words">{company.company_group_print_name}</div>
                                    {company.uid && (
                                      <div className="text-xs text-gray-500 mt-1 truncate">{company.uid}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {/* Fill empty cells to maintain 4x3 grid */}
                          {Array.from({ length: Math.max(0, 12 - Math.min(companies.length, 12)) }).map((_, index) => (
                            <div key={`empty-${index}`} className="min-h-[70px] border rounded-lg border-dashed border-gray-200 dark:border-gray-600"></div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons for Step 1 */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedCompanyForDept) {
                            setModalStep('department');
                          }
                        }}
                        disabled={!selectedCompanyForDept}
                        className={`flex-1 px-3 py-3 rounded-lg text-xs transition-colors min-h-[44px] flex items-center justify-center ${
                          selectedCompanyForDept
                            ? 'bg-blue-500 hover:bg-blue-600 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <span className="hidden sm:inline">Continue to Select Departments</span>
                        <span className="sm:hidden">Next: Departments</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDepartments([]);
                          setSelectedCompanyForDept(null);
                          setModalStep('company');
                          setShowCompanyModal(false);
                        }}
                        className="flex-1 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-xs transition-colors min-h-[40px] flex items-center justify-center"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* STEP 2: Department Selection */
              <>
                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                  <div className="space-y-4">
                    {/* Selected Company Display */}
                    {selectedCompanyForDept && (
                      <div className={`p-3 rounded border ${
                        theme === 'dark' ? 'bg-blue-900/20 border-blue-600' : 'bg-blue-50 border-blue-300'
                      }`}>
                        <div className="text-xs sm:text-sm font-medium text-blue-600 mb-1">Selected Company:</div>
                        <div className="font-medium text-sm sm:text-base truncate">{selectedCompanyForDept.company_group_print_name}</div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">Select Departments (Optional - Select multiple)</label>
                      <input
                        type="text"
                        placeholder="Search departments..."
                        value={departmentSearch}
                        onChange={(e) => setDepartmentSearch(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm mb-3 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      
                      <div className="border rounded p-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                          {DEPARTMENTS
                            .filter(dept => 
                              dept.toLowerCase().includes(departmentSearch.toLowerCase())
                            )
                            .map((department) => {
                              const isSelected = selectedDepartments.includes(department);
                              return (
                                <div
                                  key={department}
                                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                    isSelected 
                                      ? theme === 'dark' ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-300'
                                      : theme === 'dark' ? 'hover:bg-gray-700 border-gray-600' : 'hover:bg-blue-50 border-gray-200'
                                  }`}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedDepartments(prev => prev.filter(d => d !== department));
                                    } else {
                                      setSelectedDepartments(prev => [...prev, department]);
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                      isSelected 
                                        ? 'bg-blue-500 border-blue-500' 
                                        : theme === 'dark' ? 'border-gray-400' : 'border-gray-300'
                                    }`}>
                                      {isSelected && (
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium truncate">{department}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fixed Action Buttons Area */}
                <div className="flex-shrink-0 p-3 sm:p-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col gap-2">
                    {/* Main Action Buttons - Side by Side */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // Add selected departments with company
                          if (selectedDepartments.length > 0 && selectedCompanyForDept) {
                            const newAssociation: LocationAssociation = {
                              company_id: selectedCompanyForDept.record_id,
                              departments: selectedDepartments
                            };
                            setAssociations(prev => [...prev, newAssociation]);
                          } else if (selectedDepartments.length > 0) {
                            // Department only (unknown company)
                            const newAssociation: LocationAssociation = {
                              departments: selectedDepartments
                            };
                            setAssociations(prev => [...prev, newAssociation]);
                          }
                          if (!hasChangedOnce) {
                            setHasChangedOnce(true);
                            onChange();
                          }
                          setSelectedDepartments([]);
                          setSelectedCompanyForDept(null);
                          setModalStep('company');
                          setShowCompanyModal(false);
                        }}
                        className="flex-1 px-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs transition-colors min-h-[44px] flex items-center justify-center"
                        disabled={selectedDepartments.length === 0}
                      >
                        <span className="hidden sm:inline">Add {selectedDepartments.length} Dept{selectedDepartments.length !== 1 ? 's' : ''}</span>
                        <span className="sm:hidden">Add {selectedDepartments.length}</span>
                      </button>
                      {selectedCompanyForDept && (
                        <button
                          type="button"
                          onClick={() => {
                            // Add company only (no departments)
                            const newAssociation: LocationAssociation = {
                              company_id: selectedCompanyForDept.record_id
                            };
                            setAssociations(prev => [...prev, newAssociation]);
                            if (!hasChangedOnce) {
                              setHasChangedOnce(true);
                              onChange();
                            }
                            setSelectedDepartments([]);
                            setSelectedCompanyForDept(null);
                            setModalStep('company');
                            setShowCompanyModal(false);
                          }}
                          className="flex-1 px-2 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs transition-colors min-h-[44px] flex items-center justify-center"
                        >
                          <span className="hidden sm:inline">Add Company Only</span>
                          <span className="sm:hidden">Company Only</span>
                        </button>
                      )}
                    </div>
                    {/* Navigation Buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setModalStep('company')}
                        className="flex-1 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-xs transition-colors min-h-[40px] flex items-center justify-center"
                      >
                        <span className="hidden sm:inline">Back to Company Selection</span>
                        <span className="sm:hidden">Back</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDepartments([]);
                          setSelectedCompanyForDept(null);
                          setModalStep('company');
                          setShowCompanyModal(false);
                        }}
                        className="flex-1 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-xs transition-colors min-h-[40px] flex items-center justify-center"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Person Selection Modal */}
      {showPersonModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
          <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg w-full max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300`}>
            <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white flex-shrink-0">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden sm:inline">👤 Select Person</span>
                <span className="sm:hidden">Person</span>
              </h3>
              <button
                onClick={() => setShowPersonModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Search & Select Person</label>
                  <input
                    type="text"
                    placeholder="Search by name, designation, or NIC..."
                    value={personSearch}
                    onChange={(e) => {
                      setPersonSearch(e.target.value);
                      loadPersons(e.target.value);
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm mb-3 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                <div className="border rounded p-3">
                  {personsLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm">Loading persons...</span>
                      </div>
                    </div>
                  ) : personsError ? (
                    <div className="text-center py-8">
                      <div className="text-red-500 text-sm mb-2">{personsError}</div>
                      <button
                        onClick={() => loadPersons(personSearch)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Try again
                      </button>
                    </div>
                  ) : persons.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-sm">No persons found</div>
                      {personSearch && (
                        <div className="text-xs text-gray-400 mt-1">Try a different search term</div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {persons.slice(0, 12).map((person) => (
                        <div
                          key={person.record_id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            theme === 'dark' 
                              ? 'hover:bg-purple-700/30 border-gray-600'
                              : 'hover:bg-purple-50 border-gray-200'
                          } min-h-[70px] flex flex-col justify-between`}
                          onClick={() => addPersonAssociation(person)}
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-xs font-semibold text-purple-600 dark:text-purple-400 flex-shrink-0">
                              {person.person_print_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium leading-tight break-words">{person.person_print_name}</div>
                              <div className="text-xs text-gray-500 mt-1 truncate">{person.full_name}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* Fill empty cells to maintain 4x3 grid */}
                      {Array.from({ length: Math.max(0, 12 - Math.min(persons.length, 12)) }).map((_, index) => (
                        <div key={`empty-${index}`} className="min-h-[70px] border rounded-lg border-dashed border-gray-200 dark:border-gray-600"></div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => setShowPersonModal(false)}
                    className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-xs sm:text-sm transition-colors min-h-[44px] flex items-center justify-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationAddForm;