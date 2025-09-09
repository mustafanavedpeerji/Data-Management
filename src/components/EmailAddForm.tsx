import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/apiClient';

// Email form data interface
interface EmailFormData {
  email_address: string;
  is_active: 'Active' | 'Inactive';
}

// Association interface
interface EmailAssociation {
  company_id?: number;
  department?: string;
  person_id?: number;
  notes?: string;
}

// Department-only association interface
interface DepartmentAssociation {
  department: string;
  company_id?: number;
  notes?: string;
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
interface EmailAddFormProps {
  initialData?: Partial<EmailFormData>;
  onSubmit?: (data: EmailFormData, associations: EmailAssociation[]) => void;
  onCancel?: () => void;
  onChange?: () => void;
  loading?: boolean;
  isEditMode?: boolean;
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

const EmailAddForm: React.FC<EmailAddFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  onChange,
  loading = false,
  isEditMode = false,
}) => {
  const { theme } = useTheme();
  const { navigateWithConfirm } = useNavigation();

  // Form data state
  const [formData, setFormData] = useState<EmailFormData>({
    email_address: '',
    is_active: 'Active',
    ...initialData,
  });

  // Associations state
  const [associations, setAssociations] = useState<EmailAssociation[]>([]);

  // Modal states
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [personSearch, setPersonSearch] = useState('');
  const [selectedCompanyForDept, setSelectedCompanyForDept] = useState<Company | null>(null);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [currentAssociationIndex, setCurrentAssociationIndex] = useState(-1);

  // Loading states
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [personsLoading, setPersonsLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [personsError, setPersonsError] = useState<string | null>(null);

  // Change tracking
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [initialFormData, setInitialFormData] = useState<EmailFormData | null>(null);

  // Initialize form data
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const updatedFormData = { ...formData, ...initialData };
      setFormData(updatedFormData);
      setInitialFormData(updatedFormData);
      setInitialDataLoaded(true);
    } else {
      setInitialFormData(formData);
      setInitialDataLoaded(true);
    }
  }, [initialData]);

  // Track changes
  useEffect(() => {
    if (initialDataLoaded && initialFormData && onChange) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData) || associations.length > 0;
      if (hasChanges) {
        onChange();
      }
    }
  }, [formData, associations, initialDataLoaded, initialFormData, onChange]);

  // Load companies
  const loadCompanies = async (search: string = '') => {
    setCompaniesLoading(true);
    setCompaniesError(null);
    try {
      const response = await apiClient.get(`/companies/search?q=${encodeURIComponent(search)}`);
      if (response.ok) {
        const responseData = await response.json();
        // Filter to only show companies (not groups or divisions)
        const companyData = responseData.filter((item: Company) => 
          item.company_group_data_type === 'Company'
        );
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

  // Load persons
  const loadPersons = async (search: string = '') => {
    setPersonsLoading(true);
    setPersonsError(null);
    try {
      const response = await apiClient.get(`/persons/search?q=${encodeURIComponent(search)}`);
      if (response.ok) {
        const responseData = await response.json();
        setPersons(responseData);
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
  const handleInputChange = (field: keyof EmailFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Add person association
  const addPersonAssociation = (person: Person) => {
    const newAssociation: EmailAssociation = {
      person_id: person.record_id
    };
    setAssociations(prev => [...prev, newAssociation]);
    setShowPersonModal(false);
  };

  // Remove association
  const removeAssociation = (index: number) => {
    setAssociations(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData, associations);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigateWithConfirm('/emails');
    }
  };

  // Get company name by ID
  const getCompanyName = (companyId: number) => {
    const company = companies.find(c => c.record_id === companyId);
    return company ? company.company_group_print_name : `Company ${companyId}`;
  };

  // Get person name by ID
  const getPersonName = (personId: number) => {
    const person = persons.find(p => p.record_id === personId);
    return person ? person.person_print_name : `Person ${personId}`;
  };

  return (
    <div className={`w-full max-w-none mx-auto p-3 text-sm ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Compact Header */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg text-white">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h1 className="text-lg font-bold">{isEditMode ? 'Edit Email' : 'Add New Email'}</h1>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-md p-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Email Information */}
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
          <h3 className="text-lg font-semibold mb-4 text-blue-600 dark:text-blue-400">Email Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email Address *</label>
              <input
                type="email"
                value={formData.email_address}
                onChange={(e) => handleInputChange('email_address', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                }`}
                placeholder="Enter email address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.value as 'Active' | 'Inactive')}
                className={`w-full px-3 py-2 rounded-lg border text-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Associations Section */}
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Email Associations</h3>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  loadCompanies();
                  setSelectedDepartments([]);
                  setSelectedCompanyForDept(null);
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
                  loadPersons();
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

          {/* Display current associations */}
          {associations.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Current Associations ({associations.length})</h4>
              {associations.map((assoc, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50 border-blue-200'} transition-all duration-200 hover:shadow-md`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                        {/* Company */}
                        <div>
                          <span className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">Company</span>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="font-medium text-blue-700 dark:text-blue-300">
                              {assoc.company_id ? getCompanyName(assoc.company_id) : 'Not specified'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Department */}
                        <div>
                          <span className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">Department</span>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="font-medium text-green-700 dark:text-green-300">
                              {assoc.department || 'Not specified'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Person Info (if person association) */}
                      {assoc.person_id && (
                        <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="font-semibold text-gray-600 dark:text-gray-400">Person:</span>
                            <span className="font-medium text-purple-700 dark:text-purple-300">{getPersonName(assoc.person_id)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeAssociation(index)}
                      className="ml-3 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg p-2 transition-all duration-200 transform hover:scale-105"
                      title="Remove association"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`p-6 text-center rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="text-sm">No associations added yet. Click the buttons above to add companies or people.</p>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-6">
          <button
            type="button"
            onClick={handleCancel}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm border-2 rounded-lg transition-all duration-200 hover:shadow-md min-h-[44px] flex items-center justify-center ${
              theme === 'dark'
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-md min-h-[44px] flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isEditMode ? 'Update Email' : 'Create Email'}
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Company Selection Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
          <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg w-full max-w-[95vw] sm:max-w-2xl h-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-xl flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300`}>
            <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex-shrink-0">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="hidden sm:inline">🏢 Select Company & Department</span>
                <span className="sm:hidden">Company & Dept</span>
              </h3>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <div className="space-y-4">
                {/* Company Search */}
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
                  
                  <div className="h-32 sm:h-48 overflow-y-auto border rounded">
                    {companiesLoading ? (
                      <div className="text-center py-6 sm:py-8 text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-xs sm:text-sm">Loading companies...</span>
                        </div>
                      </div>
                    ) : companiesError ? (
                      <div className="text-center py-6 sm:py-8">
                        <div className="text-red-500 text-xs sm:text-sm mb-2">{companiesError}</div>
                        <button
                          onClick={() => loadCompanies(companySearch)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Try again
                        </button>
                      </div>
                    ) : companies.length === 0 ? (
                      <div className="text-center py-6 sm:py-8 text-gray-500">
                        <div className="text-xs sm:text-sm">No companies found</div>
                        {companySearch && (
                          <div className="text-xs text-gray-400 mt-1">Try a different search term</div>
                        )}
                      </div>
                    ) : (
                      companies.map((company) => (
                        <div
                          key={company.record_id}
                          className={`p-2 sm:p-3 border-b cursor-pointer transition-colors ${
                            selectedCompanyForDept?.record_id === company.record_id
                              ? theme === 'dark' 
                                ? 'bg-blue-900/30 border-blue-600'
                                : 'bg-blue-50 border-blue-300'
                              : theme === 'dark' 
                                ? 'hover:bg-gray-700 border-gray-700'
                                : 'hover:bg-gray-50 border-gray-200'
                          } min-h-[44px] flex items-center`}
                          onClick={() => setSelectedCompanyForDept(company)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm sm:text-base truncate">{company.company_group_print_name}</div>
                            {company.uid && (
                              <div className="text-xs sm:text-sm text-gray-500 truncate">UID: {company.uid}</div>
                            )}
                          </div>
                          {selectedCompanyForDept?.record_id === company.record_id && (
                            <svg className="w-5 h-5 text-blue-600 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Selected Company Display */}
                {selectedCompanyForDept && (
                  <div className={`p-2 sm:p-3 rounded border ${
                    theme === 'dark' ? 'bg-blue-900/20 border-blue-600' : 'bg-blue-50 border-blue-300'
                  }`}>
                    <div className="text-xs sm:text-sm font-medium text-blue-600 mb-1">Selected Company:</div>
                    <div className="font-medium text-sm sm:text-base truncate">{selectedCompanyForDept.company_group_print_name}</div>
                  </div>
                )}

                {/* Department Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Select Department (Optional)</label>
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
                  
                  <div className="h-24 sm:h-32 overflow-y-auto border rounded">
                    <div
                      className={`p-2 sm:p-3 border-b cursor-pointer transition-colors min-h-[44px] flex items-center ${
                        theme === 'dark' ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => {
                        // Add company-only association (no department)
                        if (selectedCompanyForDept) {
                          const newAssociation: EmailAssociation = {
                            company_id: selectedCompanyForDept.record_id
                          };
                          setAssociations(prev => [...prev, newAssociation]);
                        }
                        setSelectedCompanyForDept(null);
                        setShowCompanyModal(false);
                      }}
                    >
                      <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">
                        <span className="hidden sm:inline">📋 Company Only (No Specific Department)</span>
                        <span className="sm:hidden">📋 Company Only</span>
                      </div>
                    </div>
                    {DEPARTMENTS
                      .filter(dept => 
                        dept.toLowerCase().includes(departmentSearch.toLowerCase())
                      )
                      .map((department) => {
                        const isSelected = selectedDepartments.includes(department);
                        return (
                        <div
                          key={department}
                          className={`p-2 sm:p-3 border-b cursor-pointer transition-colors min-h-[44px] flex items-center justify-between ${
                            isSelected 
                              ? theme === 'dark' ? 'bg-green-900/30 border-green-700' : 'bg-green-100 border-green-300'
                              : theme === 'dark' ? 'hover:bg-green-900/20 border-gray-700' : 'hover:bg-green-50 border-gray-200'
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              // Remove from selection
                              setSelectedDepartments(prev => prev.filter(d => d !== department));
                            } else {
                              // Add to selection
                              setSelectedDepartments(prev => [...prev, department]);
                            }
                          }}
                        >
                          <div className="text-xs sm:text-sm truncate">{department}</div>
                          {isSelected && (
                            <svg className="w-4 h-4 text-green-600 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        );
                      })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between gap-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => {
                      // Add selected departments with company
                      if (selectedDepartments.length > 0 && selectedCompanyForDept) {
                        selectedDepartments.forEach(department => {
                          const newAssociation: EmailAssociation = {
                            company_id: selectedCompanyForDept.record_id,
                            department
                          };
                          setAssociations(prev => [...prev, newAssociation]);
                        });
                      }
                      setSelectedDepartments([]);
                      setSelectedCompanyForDept(null);
                      setShowCompanyModal(false);
                    }}
                    className="px-3 sm:px-4 py-2 sm:py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs sm:text-sm transition-colors min-h-[44px] flex items-center justify-center"
                    disabled={selectedDepartments.length === 0}
                  >
                    <span className="hidden sm:inline">✅ Add Selected Departments ({selectedDepartments.length})</span>
                    <span className="sm:hidden">✅ Add ({selectedDepartments.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Add Unknown Company + Department
                      if (departmentSearch.trim()) {
                        const matchedDept = DEPARTMENTS.find(dept => 
                          dept.toLowerCase().includes(departmentSearch.toLowerCase())
                        );
                        if (matchedDept) {
                          const newAssociation: EmailAssociation = {
                            department: matchedDept
                          };
                          setAssociations(prev => [...prev, newAssociation]);
                          setDepartmentSearch('');
                          setSelectedDepartments([]);
                          setSelectedCompanyForDept(null);
                          setShowCompanyModal(false);
                        }
                      }
                    }}
                    className="px-3 sm:px-4 py-2 sm:py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs sm:text-sm transition-colors min-h-[44px] flex items-center justify-center"
                    disabled={!departmentSearch.trim()}
                  >
                    <span className="hidden sm:inline">🏢 Add Department Only (Unknown Company)</span>
                    <span className="sm:hidden">🏢 Dept Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDepartments([]);
                      setSelectedCompanyForDept(null);
                      setShowCompanyModal(false);
                    }}
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


      {/* Person Selection Modal */}
      {showPersonModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
          <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg w-full max-w-[95vw] sm:max-w-xl h-full max-h-[95vh] sm:max-h-[80vh] overflow-hidden shadow-xl flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300`}>
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

                <div className="flex-1 min-h-[200px] overflow-y-auto border rounded">
                  {personsLoading ? (
                    <div className="text-center py-6 sm:py-8 text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-xs sm:text-sm">Loading persons...</span>
                      </div>
                    </div>
                  ) : personsError ? (
                    <div className="text-center py-6 sm:py-8">
                      <div className="text-red-500 text-xs sm:text-sm mb-2">{personsError}</div>
                      <button
                        onClick={() => loadPersons(personSearch)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Try again
                      </button>
                    </div>
                  ) : persons.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-gray-500">
                      <div className="text-xs sm:text-sm">No persons found</div>
                      {personSearch && (
                        <div className="text-xs text-gray-400 mt-1">Try a different search term</div>
                      )}
                    </div>
                  ) : (
                    persons.map((person) => (
                      <div
                        key={person.record_id}
                        className={`p-2 sm:p-3 border-b cursor-pointer hover:bg-purple-50 transition-colors min-h-[60px] flex items-center ${
                          theme === 'dark' ? 'border-gray-700 hover:bg-purple-900/20' : 'border-gray-200'
                        }`}
                        onClick={() => addPersonAssociation(person)}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 w-full">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400 flex-shrink-0">
                            {person.person_print_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs sm:text-sm truncate">{person.person_print_name}</div>
                            <div className="text-xs text-gray-500 truncate">{person.full_name}</div>
                            <div className="text-xs text-gray-400">Status: {person.living_status}</div>
                          </div>
                          <svg className="w-4 h-4 text-purple-600 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))
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

export default EmailAddForm;