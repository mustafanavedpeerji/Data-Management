import React, { useState, useEffect, useRef } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/apiClient';

// Cell phone form data interface
interface CellPhoneFormData {
  phone_number: string;
  is_active: 'Active' | 'Inactive';
}

// Association interface
interface CellPhoneAssociation {
  association_id?: number;
  company_id?: number;
  departments?: string[];
  person_id?: number;
}

// Department-only association interface
interface DepartmentAssociation {
  departments: string[];
  company_id?: number;
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
interface CellPhoneAddFormProps {
  initialData?: Partial<CellPhoneFormData>;
  initialAssociations?: CellPhoneAssociation[];
  onSubmit?: (data: CellPhoneFormData, associations: CellPhoneAssociation[]) => void;
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

const CellPhoneAddForm: React.FC<CellPhoneAddFormProps> = ({
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
  const [formData, setFormData] = useState<CellPhoneFormData>(() => ({
    phone_number: '',
    is_active: 'Active',
    ...initialData,
  }));

  // Associations state
  const [associations, setAssociations] = useState<CellPhoneAssociation[]>(() => initialAssociations || []);

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
  const [modalStep, setModalStep] = useState<'company' | 'department'>('company');

  // Loading states
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [personsLoading, setPersonsLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [personsError, setPersonsError] = useState<string | null>(null);

  // Simple change tracking
  const [hasChangedOnce, setHasChangedOnce] = useState(false);

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

  // Phone number validation
  const validatePhoneNumber = (phoneNumber: string): boolean => {
    // Pakistani phone number formats:
    // +92-300-1234567
    // 0300-1234567  
    // 03001234567
    const patterns = [
      /^\+92-\d{3}-\d{7}$/,  // +92-300-1234567
      /^0\d{3}-\d{7}$/,      // 0300-1234567
      /^0\d{10}$/,           // 03001234567
    ];
    
    return patterns.some(pattern => pattern.test(phoneNumber));
  };

  // Handle form input changes
  const handleInputChange = (field: keyof CellPhoneFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Call onChange callback if provided and not already called
    if (onChange && !hasChangedOnce) {
      setHasChangedOnce(true);
      onChange();
    }
  };

  // Add person association
  const addPersonAssociation = (person: Person) => {
    const newAssociation: CellPhoneAssociation = {
      person_id: person.record_id
    };
    setAssociations(prev => [...prev, newAssociation]);
    if (onChange && !hasChangedOnce) {
      setHasChangedOnce(true);
      onChange();
    }
    setShowPersonModal(false);
  };

  // Remove association
  const removeAssociation = (index: number) => {
    setAssociations(prev => prev.filter((_, i) => i !== index));
    if (onChange && !hasChangedOnce) {
      setHasChangedOnce(true);
      onChange();
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number
    if (!validatePhoneNumber(formData.phone_number)) {
      alert('Please enter a valid phone number format:\n• +92-300-1234567\n• 0300-1234567\n• 03001234567');
      return;
    }
    
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
      navigateWithConfirm('/cell-phones');
    }
  };

  // Get company name by ID
  const getCompanyName = (companyId: number) => {
    // First try the lookup prop (from edit page)
    if (companyLookup[companyId]) {
      return companyLookup[companyId];
    }
    // Fall back to local companies array (from modal search)
    const company = companies.find(c => c.record_id === companyId);
    return company ? company.company_group_print_name : `Company ${companyId}`;
  };

  // Get person name by ID
  const getPersonName = (personId: number) => {
    // First try the lookup prop (from edit page)
    if (personLookup[personId]) {
      return personLookup[personId];
    }
    // Fall back to local persons array (from modal search)
    const person = persons.find(p => p.record_id === personId);
    return person ? person.person_print_name : `Person ${personId}`;
  };

  // Group associations by company for better display
  const groupedAssociations = () => {
    const companyGroups: { [key: string]: CellPhoneAssociation[] } = {};
    const personAssociations: CellPhoneAssociation[] = [];
    
    associations.forEach((assoc) => {
      if (assoc.person_id) {
        // Person associations go separate
        personAssociations.push(assoc);
      } else if (assoc.company_id) {
        // Group by company
        const key = assoc.company_id.toString();
        if (!companyGroups[key]) {
          companyGroups[key] = [];
        }
        companyGroups[key].push(assoc);
      } else if (assoc.departments && assoc.departments.length > 0) {
        // Department only (unknown company)
        const key = 'unknown_company';
        if (!companyGroups[key]) {
          companyGroups[key] = [];
        }
        companyGroups[key].push(assoc);
      }
    });
    
    return { companyGroups, personAssociations };
  };

  return (
    <div className={`w-full max-w-none mx-auto p-3 text-sm ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Compact Header */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg text-white">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <h1 className="text-lg font-bold">{isEditMode ? 'Edit Cell Phone' : 'Add New Cell Phone'}</h1>
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

        {/* Cell Phone Information */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-sm font-medium mb-1">Cell Phone Information</h3>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs mb-1">Phone Number *</label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                placeholder="e.g., +92-300-1234567"
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                Formats: +92-300-1234567, 0300-1234567, or 03001234567
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1">Status</label>
              <select
                value={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.value as 'Active' | 'Inactive')}
                className={`w-full px-2 py-1 rounded border text-xs ${
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
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium">Cell Phone Associations</h3>
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

          {/* Display current associations - Two Column Layout */}
          {(() => {
            const { companyGroups, personAssociations } = groupedAssociations();
            const hasCompanyAssociations = Object.keys(companyGroups).length > 0;
            const hasPersonAssociations = personAssociations.length > 0;

            if (!hasCompanyAssociations && !hasPersonAssociations) {
              return (
                <div className={`p-6 text-center rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-sm">No associations added yet. Click the buttons above to add companies or people.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Company & Departments Column */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 border-b border-blue-200 dark:border-blue-700 pb-2">
                    🏢 Companies & Departments ({Object.keys(companyGroups).length})
                  </h4>
                  {hasCompanyAssociations ? (
                    Object.entries(companyGroups).map(([companyKey, groupAssocs]) => {
                      const isUnknownCompany = companyKey === 'unknown_company';
                      const companyName = isUnknownCompany 
                        ? 'Unknown Company' 
                        : getCompanyName(parseInt(companyKey));
                      
                      // Separate company-only vs company+department associations
                      const companyOnlyAssocs = groupAssocs.filter(a => !a.departments || a.departments.length === 0);
                      const deptAssocs = groupAssocs.filter(a => a.departments && a.departments.length > 0);
                      
                      return (
                        <div
                          key={companyKey}
                          className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50 border-blue-200'} transition-all duration-200`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="font-medium text-blue-700 dark:text-blue-300 text-sm">
                                {companyName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Edit Button - Only show for associations with departments */}
                              {deptAssocs.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Find the association with departments for this company
                                    const assocWithDepts = deptAssocs[0];
                                    if (assocWithDepts && assocWithDepts.company_id) {
                                      // Pre-populate the modal with existing data
                                      const company = companies.find(c => c.record_id === assocWithDepts.company_id);
                                      if (company) {
                                        setSelectedCompanyForDept(company);
                                        setSelectedDepartments(assocWithDepts.departments || []);
                                        setModalStep('department');
                                        setShowCompanyModal(true);
                                        // Remove the existing association so it can be updated
                                        const indexToRemove = associations.findIndex(a => a === assocWithDepts);
                                        if (indexToRemove !== -1) {
                                          removeAssociation(indexToRemove);
                                        }
                                      }
                                    } else if (companyKey === 'unknown_company') {
                                      // Handle department-only associations
                                      const deptOnlyAssoc = deptAssocs[0];
                                      if (deptOnlyAssoc) {
                                        setSelectedCompanyForDept(null);
                                        setSelectedDepartments(deptOnlyAssoc.departments || []);
                                        setModalStep('department');
                                        setShowCompanyModal(true);
                                        // Remove the existing association so it can be updated
                                        const indexToRemove = associations.findIndex(a => a === deptOnlyAssoc);
                                        if (indexToRemove !== -1) {
                                          removeAssociation(indexToRemove);
                                        }
                                      }
                                    }
                                  }}
                                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded p-1 transition-colors"
                                  title="Edit departments for this company"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  // Remove all associations for this company
                                  const indicesToRemove: number[] = [];
                                  associations.forEach((assoc, index) => {
                                    if (
                                      (assoc.company_id?.toString() === companyKey) ||
                                      (companyKey === 'unknown_company' && !assoc.company_id && assoc.departments && assoc.departments.length > 0)
                                    ) {
                                      indicesToRemove.push(index);
                                    }
                                  });
                                  // Remove in reverse order to maintain indices
                                  indicesToRemove.reverse().forEach(index => removeAssociation(index));
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 rounded p-1 transition-colors"
                                title="Remove all associations for this company"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          {/* Company-only associations */}
                          {companyOnlyAssocs.length > 0 && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              📋 General company association (no specific department)
                            </div>
                          )}
                          
                          {/* Department associations */}
                          {deptAssocs.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs text-gray-600 dark:text-gray-400">Departments:</div>
                              <div className="flex flex-wrap gap-1">
                                {deptAssocs.map((assoc, idx) => (
                                  assoc.departments?.map((dept, deptIdx) => (
                                    <span
                                      key={`${idx}-${deptIdx}`}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'}`}
                                    >
                                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                      {dept}
                                    </span>
                                  ))
                                ))
                    }</div>
                            </div>
                          )}
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
                      return (
                        <div
                          key={originalIndex}
                          className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-purple-50 border-purple-200'} transition-all duration-200`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              <span className="font-medium text-purple-700 dark:text-purple-300 text-sm">
                                {assoc.person_id ? getPersonName(assoc.person_id) : 'Unknown Person'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAssociation(originalIndex)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 rounded p-1 transition-colors"
                              title="Remove person association"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
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
            );
          })()}
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-6">
          <button
            type="button"
            onClick={handleCancel}
            className={`px-4 py-1 text-xs border rounded transition-colors ${
              theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : (isEditMode ? 'Update Cell Phone' : 'Add Cell Phone')}
          </button>
        </div>
      </form>

      {/* Company Selection Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
          <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300`}>
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
            
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {modalStep === 'company' ? (
                /* STEP 1: Company Selection */
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
                    
                    <div className="h-32 sm:h-40 overflow-y-auto border rounded">
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
                            className={`p-3 border-b cursor-pointer transition-colors ${
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
                              <div className="text-xs truncate">{company.company_group_print_name}</div>
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

                  {/* Action Buttons for Step 1 */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => setModalStep('department')}
                      className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors min-h-[44px] flex items-center justify-center"
                      disabled={!selectedCompanyForDept}
                    >
                      <span className="hidden sm:inline">Continue to Select Departments</span>
                      <span className="sm:hidden">Continue</span>
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // Skip to department only (unknown company)
                          setSelectedCompanyForDept(null);
                          setModalStep('department');
                        }}
                        className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs transition-colors min-h-[40px] flex items-center justify-center"
                      >
                        <span className="hidden sm:inline">Add Departments Without Company</span>
                        <span className="sm:hidden">Dept Only</span>
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
              ) : (
                /* STEP 2: Department Selection */
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
                    
                    <div className="h-32 sm:h-40 overflow-y-auto border rounded">
                      {DEPARTMENTS
                        .filter(dept => 
                          dept.toLowerCase().includes(departmentSearch.toLowerCase())
                        )
                        .map((department) => {
                          const isSelected = selectedDepartments.includes(department);
                          return (
                          <div
                            key={department}
                            className={`p-3 border-b cursor-pointer transition-colors min-h-[44px] flex items-center justify-between ${
                              isSelected 
                                ? theme === 'dark' ? 'bg-green-900/30 border-green-700' : 'bg-green-100 border-green-300'
                                : theme === 'dark' ? 'hover:bg-green-900/20 border-gray-700' : 'hover:bg-green-50 border-gray-200'
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedDepartments(prev => prev.filter(d => d !== department));
                              } else {
                                setSelectedDepartments(prev => [...prev, department]);
                              }
                            }}
                          >
                            <div className="text-sm truncate">{department}</div>
                            {isSelected && (
                              <svg className="w-5 h-5 text-green-600 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Action Buttons for Step 2 */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                    {/* Main Action Buttons - Side by Side */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // Add selected departments with company
                          if (selectedDepartments.length > 0 && selectedCompanyForDept) {
                            const newAssociation: CellPhoneAssociation = {
                              company_id: selectedCompanyForDept.record_id,
                              departments: selectedDepartments
                            };
                            setAssociations(prev => [...prev, newAssociation]);
                          } else if (selectedDepartments.length > 0) {
                            // Department only (unknown company)
                            const newAssociation: CellPhoneAssociation = {
                              departments: selectedDepartments
                            };
                            setAssociations(prev => [...prev, newAssociation]);
                          }
                          if (onChange && !hasChangedOnce) {
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
                            const newAssociation: CellPhoneAssociation = {
                              company_id: selectedCompanyForDept.record_id
                            };
                            setAssociations(prev => [...prev, newAssociation]);
                            if (onChange && !hasChangedOnce) {
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
              )}
            </div>
          </div>
        </div>
      )}


      {/* Person Selection Modal */}
      {showPersonModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
          <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg w-full max-w-[95vw] sm:max-w-xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300`}>
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

                <div className="h-32 sm:h-40 overflow-y-auto border rounded">
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
                            <div className="text-xs truncate">{person.full_name}</div>
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

export default CellPhoneAddForm;