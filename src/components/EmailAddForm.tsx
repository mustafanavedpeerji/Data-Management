import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/apiClient';

// Email form data interface
interface EmailFormData {
  email_address: string;
  email_type: string;
  description: string;
  is_active: 'Active' | 'Inactive';
}

// Association interface
interface EmailAssociation {
  company_id?: number;
  department?: string;
  person_id?: number;
  association_type?: string;
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
  person_id: number;
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

// Email types
const EMAIL_TYPES = [
  { value: 'business', label: 'Business' },
  { value: 'personal', label: 'Personal' },
  { value: 'support', label: 'Support' },
  { value: 'sales', label: 'Sales' },
  { value: 'info', label: 'Info' },
  { value: 'admin', label: 'Admin' },
  { value: 'other', label: 'Other' }
];

// Association types
const ASSOCIATION_TYPES = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'support', label: 'Support' },
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical' },
  { value: 'other', label: 'Other' }
];

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
  const { navigate } = useNavigation();

  // Form data state
  const [formData, setFormData] = useState<EmailFormData>({
    email_address: '',
    email_type: 'business',
    description: '',
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

  // Loading states
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [personsLoading, setPersonsLoading] = useState(false);

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
    try {
      const response = await apiClient.get(`/companies/search?q=${encodeURIComponent(search)}`);
      // Filter to only show companies (not groups or divisions)
      const companyData = response.data.filter((item: Company) => 
        item.company_group_data_type === 'Company'
      );
      setCompanies(companyData);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setCompaniesLoading(false);
    }
  };

  // Load persons
  const loadPersons = async (search: string = '') => {
    setPersonsLoading(true);
    try {
      const response = await apiClient.get(`/persons/search?q=${encodeURIComponent(search)}`);
      setPersons(response.data);
    } catch (error) {
      console.error('Error loading persons:', error);
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

  // Add company association
  const addCompanyAssociation = (company: Company, department?: string) => {
    const newAssociation: EmailAssociation = {
      company_id: company.record_id,
      department,
      association_type: 'primary'
    };
    setAssociations(prev => [...prev, newAssociation]);
    setShowCompanyModal(false);
  };

  // Add person association
  const addPersonAssociation = (person: Person) => {
    const newAssociation: EmailAssociation = {
      person_id: person.person_id,
      association_type: 'primary'
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
      navigate('/emails');
    }
  };

  // Get company name by ID
  const getCompanyName = (companyId: number) => {
    const company = companies.find(c => c.record_id === companyId);
    return company ? company.company_group_print_name : `Company ${companyId}`;
  };

  // Get person name by ID
  const getPersonName = (personId: number) => {
    const person = persons.find(p => p.person_id === personId);
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
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-sm font-medium mb-1">Email Information</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1">Email Address *</label>
              <input
                type="email"
                value={formData.email_address}
                onChange={(e) => handleInputChange('email_address', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                placeholder="Enter email address"
                required
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Email Type</label>
              <select
                value={formData.email_type}
                onChange={(e) => handleInputChange('email_type', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
              >
                {EMAIL_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
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
            <div>
              <label className="block text-xs mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                placeholder="Optional description"
              />
            </div>
          </div>
        </div>

        {/* Associations Section */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-sm font-medium mb-2">Email Associations</h3>
          
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                loadCompanies();
                setShowCompanyModal(true);
              }}
              className="flex-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
            >
              <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Add Company
            </button>
            <button
              type="button"
              onClick={() => {
                loadPersons();
                setShowPersonModal(true);
              }}
              className="flex-1 px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs transition-colors"
            >
              <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Add Person
            </button>
          </div>

          {/* Display current associations */}
          {associations.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-gray-600 mb-1">Current Associations ({associations.length})</h4>
              {associations.map((assoc, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded text-xs ${
                    theme === 'dark' ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex-1">
                    {assoc.company_id && (
                      <div className="flex items-center gap-1">
                        <span className="text-blue-600 font-medium">🏢 Company:</span>
                        <span>{getCompanyName(assoc.company_id)}</span>
                        {assoc.department && (
                          <span className="text-gray-500">({assoc.department})</span>
                        )}
                      </div>
                    )}
                    {assoc.person_id && (
                      <div className="flex items-center gap-1">
                        <span className="text-purple-600 font-medium">👤 Person:</span>
                        <span>{getPersonName(assoc.person_id)}</span>
                      </div>
                    )}
                    {assoc.association_type && (
                      <span className="text-xs text-gray-500 ml-2">
                        Type: {assoc.association_type}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAssociation(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                    title="Remove association"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-3">
          <button
            type="button"
            onClick={handleCancel}
            className={`px-4 py-2 text-xs border rounded transition-colors ${
              theme === 'dark'
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isEditMode ? 'Update Email' : 'Create Email'}
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg w-full max-w-md max-h-96 overflow-hidden shadow-xl`}>
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Select Company
              </h3>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded p-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-3">
              <input
                type="text"
                placeholder="Search companies..."
                value={companySearch}
                onChange={(e) => {
                  setCompanySearch(e.target.value);
                  loadCompanies(e.target.value);
                }}
                className={`w-full px-2 py-1 border rounded text-xs mb-2 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />

              <div className="max-h-64 overflow-y-auto">
                {companiesLoading ? (
                  <div className="text-center py-8 text-gray-500 text-xs">Loading companies...</div>
                ) : companies.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs">No companies found</div>
                ) : (
                  companies.map((company) => (
                    <div
                      key={company.record_id}
                      className={`p-2 border-b cursor-pointer hover:bg-blue-50 text-xs transition-colors ${
                        theme === 'dark' ? 'border-gray-700 hover:bg-blue-900/20' : 'border-gray-200'
                      }`}
                      onClick={() => addCompanyAssociation(company)}
                    >
                      <div className="font-medium">{company.company_group_print_name}</div>
                      {company.uid && (
                        <div className="text-xs text-gray-500">UID: {company.uid}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Person Modal */}
      {showPersonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg w-full max-w-md max-h-96 overflow-hidden shadow-xl`}>
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Select Person
              </h3>
              <button
                onClick={() => setShowPersonModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded p-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-3">
              <input
                type="text"
                placeholder="Search persons..."
                value={personSearch}
                onChange={(e) => {
                  setPersonSearch(e.target.value);
                  loadPersons(e.target.value);
                }}
                className={`w-full px-2 py-1 border rounded text-xs mb-2 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />

              <div className="max-h-64 overflow-y-auto">
                {personsLoading ? (
                  <div className="text-center py-8 text-gray-500 text-xs">Loading persons...</div>
                ) : persons.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs">No persons found</div>
                ) : (
                  persons.map((person) => (
                    <div
                      key={person.person_id}
                      className={`p-2 border-b cursor-pointer hover:bg-purple-50 text-xs transition-colors ${
                        theme === 'dark' ? 'border-gray-700 hover:bg-purple-900/20' : 'border-gray-200'
                      }`}
                      onClick={() => addPersonAssociation(person)}
                    >
                      <div className="font-medium">{person.person_print_name}</div>
                      <div className="text-xs text-gray-500">{person.full_name}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailAddForm;