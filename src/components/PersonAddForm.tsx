import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/apiClient';

// Form data interface
interface PersonFormData {
  person_print_name: string;
  full_name: string;
  gender: 'Male' | 'Female';
  living_status: 'Active' | 'Dead' | 'Missing';
  professional_status: string;
  religion: string;
  community: string;
  base_city: string;
  attached_companies: number[];
  department: string;
  designation: string;
  date_of_birth: string;
  birth_day: string;
  birth_month: string;
  birth_year: string;
  age_bracket: string;
  nic: string;
}

// Company interface for modal
interface Company {
  record_id: number;
  uid?: string;
  company_group_print_name: string;
  company_group_data_type: 'Company' | 'Group' | 'Division';
  living_status?: string;
}

// Props interface
interface PersonAddFormProps {
  initialData?: Partial<PersonFormData>;
  onSubmit?: (data: PersonFormData) => void;
  onCancel?: () => void;
  onChange?: () => void;
  loading?: boolean;
  isEditMode?: boolean;
}

// Pakistani cities
const PAKISTANI_CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Hyderabad", 
  "Gujranwala", "Peshawar", "Quetta", "Sialkot", "Bahawalpur", "Sargodha", "Sukkur", 
  "Larkana", "Sheikhupura", "Mirpur Khas", "Rahim Yar Khan", "Gujrat", "Sahiwal", 
  "Okara", "Wah Cantonment", "Dera Ghazi Khan", "Mardan", "Kasur", "Mingora", 
  "Nawabshah", "Chiniot", "Kotri", "Khanpur", "Hafizabad", "Sadiqabad", "Jacobabad", 
  "Shikarpur", "Khanewal", "Jhang", "Attock", "Muzaffargarh", "Mandi Bahauddin"
];

// Departments
const DEPARTMENTS = [
  "Board Member",
  "Management All",
  "Management Operations", 
  "Management Administration",
  "Engineering Department",
  "Research & Development",
  "Regulatory & Legal",
  "Quality Control",
  "Human Resource",
  "Training & Development",
  "Purchase & Procurement",
  "Logistics & Distribution",
  "Finance & Accounts",
  "Audit Department",
  "Information Technology",
  "Creative Department",
  "Customer Support",
  "Sales & Support",
  "Marketing & Sales",
  "Marketing & Planning",
  "Marketing & Digital",
  "eCommerce Department",
  "PR Department",
  "Editorial Department",
  "Import Export",
  "Protocol & Security",
  "Examination Department",
  "Academics Department",
  "Admissions Department"
];

// Age Bracket Options
const AGE_BRACKET_OPTIONS = [
  { value: '', label: 'Select Age Bracket' },
  { value: '20-30', label: '20-30' },
  { value: '30-40', label: '30-40' },
  { value: '40-50', label: '40-50' },
  { value: '50-60', label: '50-60' },
  { value: '60-70', label: '60-70' },
  { value: '70-80', label: '70-80' },
  { value: '80-90', label: '80-90' }
];

const PROFESSIONAL_STATUS_OPTIONS = [
  { value: '', label: 'Select Status' },
  { value: 'Professional', label: 'Professional' },
  { value: 'Retired', label: 'Retired' },
  { value: 'Student', label: 'Student' },
  { value: 'Disabled', label: 'Disabled' },
  { value: 'Missing', label: 'Missing' },
  { value: 'Unemployed', label: 'Unemployed' }
];

const RELIGION_OPTIONS = [
  { value: '', label: 'Select Religion' },
  { value: 'Islam', label: 'Islam' },
  { value: 'Hindu', label: 'Hindu' },
  { value: 'Christian', label: 'Christian' },
  { value: 'Persian', label: 'Persian' },
  { value: 'Sikh', label: 'Sikh' },
  { value: 'Buddhist', label: 'Buddhist' },
  { value: 'Other', label: 'Other' },
  { value: 'Unknown', label: 'Unknown' }
];

const COMMUNITY_OPTIONS = [
  { value: '', label: 'Select Community' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Memon', label: 'Memon' },
  { value: 'Bohri', label: 'Bohri' },
  { value: 'Punjabi', label: 'Punjabi' },
  { value: 'Sindhi', label: 'Sindhi' },
  { value: 'Baloch', label: 'Baloch' },
  { value: 'Pathan', label: 'Pathan' },
  { value: 'Unknown', label: 'Unknown' },
  { value: 'Other', label: 'Other' }
];

const PersonAddForm: React.FC<PersonAddFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  onChange,
  loading = false,
  isEditMode = false
}) => {
  const { setUnsavedChanges } = useNavigation();
  const { theme } = useTheme();
  
  const [formData, setFormData] = useState<PersonFormData>({
    person_print_name: '',
    full_name: '',
    gender: 'Male',
    living_status: 'Active',
    professional_status: '',
    religion: '',
    community: '',
    base_city: '',
    attached_companies: [],
    department: '',
    designation: '',
    date_of_birth: '',
    birth_day: '',
    birth_month: '',
    birth_year: '',
    age_bracket: '',
    nic: '',
    ...initialData
  });

  const [errors, setErrors] = useState<Partial<PersonFormData>>({});
  const [unsavedChanges, setUnsavedChangesLocal] = useState(false);
  
  // Company modal states
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Track if initial data has been loaded
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [initialFormData, setInitialFormData] = useState<PersonFormData | null>(null);

  // Set initial data when component loads
  useEffect(() => {
    if (!initialDataLoaded && formData) {
      setInitialFormData({ ...formData });
      setInitialDataLoaded(true);
    }
  }, [formData, initialDataLoaded]);

  // Track form changes for unsaved changes warning (only after initial load)
  useEffect(() => {
    if (initialDataLoaded && initialFormData) {
      // Check if current formData differs from initialFormData
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
      
      if (hasChanges && onChange) {
        onChange();
      }
      
      if (hasChanges && !unsavedChanges) {
        setUnsavedChangesLocal(true);
        setUnsavedChanges(true);
      } else if (!hasChanges && unsavedChanges) {
        setUnsavedChangesLocal(false);
        setUnsavedChanges(false);
      }
    }
  }, [formData, onChange, unsavedChanges, setUnsavedChanges, initialDataLoaded, initialFormData]);

  // Auto-calculate age bracket based on date of birth
  const calculateAgeBracket = (birthDate: string): string => {
    if (!birthDate) return '';
    
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear() - 
      ((today.getMonth() < birth.getMonth() || 
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) ? 1 : 0);
    
    if (age < 20) return '';
    if (age <= 30) return '20-30';
    if (age <= 40) return '30-40';
    if (age <= 50) return '40-50';
    if (age <= 60) return '50-60';
    if (age <= 70) return '60-70';
    if (age <= 80) return '70-80';
    if (age <= 90) return '80-90';
    return '';
  };

  const handleInputChange = (field: keyof PersonFormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-populate person print name from full name (first name only)
      if (field === 'full_name' && value) {
        const firstName = value.trim().split(' ')[0];
        updated.person_print_name = firstName;
      }
      
      // Auto-calculate date_of_birth and age bracket when birth components change
      if (field === 'birth_day' || field === 'birth_month' || field === 'birth_year') {
        const day = field === 'birth_day' ? value : updated.birth_day;
        const month = field === 'birth_month' ? value : updated.birth_month;
        const year = field === 'birth_year' ? value : updated.birth_year;
        
        if (day && month && year) {
          const dateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          updated.date_of_birth = dateString;
          updated.age_bracket = calculateAgeBracket(dateString);
        }
      }
      
      // Auto-calculate age bracket when date of birth changes directly
      if (field === 'date_of_birth') {
        updated.age_bracket = calculateAgeBracket(value);
        
        // Also parse and populate individual fields
        if (value) {
          const dateParts = value.split('-');
          if (dateParts.length === 3) {
            updated.birth_year = dateParts[0];
            updated.birth_month = dateParts[1];
            updated.birth_day = dateParts[2];
          }
        }
      }
      
      return updated;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PersonFormData> = {};

    // Required fields
    if (!formData.person_print_name.trim()) {
      newErrors.person_print_name = 'Person print name is required';
    }
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    // NIC validation
    if (formData.nic) {
      const cleanNic = formData.nic.replace(/[-\s]/g, '');
      if (cleanNic.length !== 13 && cleanNic.length !== 15) {
        newErrors.nic = 'NIC must be 13 or 15 digits';
      } else if (!/^\d+$/.test(cleanNic)) {
        newErrors.nic = 'NIC must contain only digits';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Company modal functions
  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      // Only get actual companies from companies table
      const companiesResponse = await apiClient.get('/companies/');

      const allCompanies: Company[] = [];
      
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json();
        
        // Only include items that are actually companies
        const actualCompanies = companiesData.filter((item: any) => 
          item.company_group_data_type === 'Company'
        );
        
        allCompanies.push(...actualCompanies);
      }
      
      setCompanies(allCompanies);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleCompanyToggle = (companyId: number) => {
    const updatedCompanies = formData.attached_companies.includes(companyId)
      ? formData.attached_companies.filter(id => id !== companyId)
      : [...formData.attached_companies, companyId];
    
    setFormData(prev => ({
      ...prev,
      attached_companies: updatedCompanies
    }));
    setUnsavedChangesLocal(true);
    setUnsavedChanges(true);
  };

  const openCompanyModal = () => {
    setShowCompanyModal(true);
    if (companies.length === 0) {
      loadCompanies();
    }
  };

  const getSelectedCompanyNames = () => {
    return formData.attached_companies
      .map(id => companies.find(c => c.record_id === id)?.company_group_print_name)
      .filter(Boolean);
  };

  const filteredCompanies = companies.filter(company =>
    company.company_group_print_name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (onSubmit) {
      await onSubmit(formData);
      // Reset unsaved changes flag after successful submission
      setUnsavedChangesLocal(false);
      setUnsavedChanges(false);
    }
  };

  return (
    <div className={`p-3 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Compact Header */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg text-white">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h1 className="text-lg font-bold">{isEditMode ? 'Edit Person' : 'Add New Person'}</h1>
          </div>
        </div>

        {/* Basic Information */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-sm font-medium mb-1">Basic Information</h3>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs mb-1">Full Name *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                placeholder="Full name"
              />
              {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
            </div>
            <div>
              <label className="block text-xs mb-1">Person Print Name *</label>
              <input
                type="text"
                value={formData.person_print_name}
                onChange={(e) => handleInputChange('person_print_name', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                placeholder="Print name (auto-filled)"
              />
              {errors.person_print_name && <p className="text-xs text-red-500">{errors.person_print_name}</p>}
            </div>
            <div>
              <label className="block text-xs mb-1">Gender *</label>
              <div className="flex gap-1">
                {['Male', 'Female'].map((gender) => (
                  <label key={gender} className="flex items-center text-xs">
                    <input
                      type="radio"
                      name="gender"
                      value={gender}
                      checked={formData.gender === gender}
                      onChange={(e) => handleInputChange('gender', e.target.value as 'Male' | 'Female')}
                      className="w-3 h-3 text-purple-600 mr-1"
                    />
                    {gender}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1">NIC</label>
              <input
                type="text"
                value={formData.nic}
                onChange={(e) => handleInputChange('nic', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                placeholder="42101-1234567-8"
              />
              {errors.nic && <p className="text-xs text-red-500">{errors.nic}</p>}
            </div>
          </div>
        </div>

        {/* Status & Demographics */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-sm font-medium mb-1">Status & Demographics</h3>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs mb-1">Living Status</label>
              <select
                value={formData.living_status}
                onChange={(e) => handleInputChange('living_status', e.target.value as 'Active' | 'Dead' | 'Missing')}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
              >
                <option value="Active">Active</option>
                <option value="Dead">Dead</option>
                <option value="Missing">Missing</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Professional Status</label>
              <select
                value={formData.professional_status}
                onChange={(e) => handleInputChange('professional_status', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
              >
                {PROFESSIONAL_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Religion</label>
              <select
                value={formData.religion}
                onChange={(e) => handleInputChange('religion', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
              >
                {RELIGION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Community</label>
              <select
                value={formData.community}
                onChange={(e) => handleInputChange('community', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
              >
                {COMMUNITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Location & Professional Information */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-sm font-medium mb-1">Location & Professional Information</h3>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs mb-1">Base City</label>
              <select
                value={formData.base_city}
                onChange={(e) => handleInputChange('base_city', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
              >
                <option value="">Select Base City</option>
                {PAKISTANI_CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                placeholder="Enter designation"
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
              />
            </div>
          </div>
          
          {/* Attached Companies - Full Width Below */}
          <div className="mt-3">
            <label className="block text-xs mb-1">Attached Companies</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={openCompanyModal}
                className={`w-full px-2 py-1 text-xs rounded border-2 border-dashed ${
                  theme === 'dark' 
                    ? 'border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                } transition-colors`}
              >
                + Select Companies
              </button>
              {getSelectedCompanyNames().length > 0 && (
                <div className="text-xs space-y-1 max-h-20 overflow-y-auto">
                  {getSelectedCompanyNames().map((name, index) => (
                    <div key={index} className={`px-2 py-1 rounded text-xs ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Age Information */}
        <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-sm font-medium mb-1">Age Information</h3>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs mb-1">Birth Year</label>
              <input
                type="number"
                value={formData.birth_year}
                onChange={(e) => handleInputChange('birth_year', e.target.value)}
                className={`w-full px-1 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                placeholder="YYYY"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Birth Day</label>
              <input
                type="number"
                value={formData.birth_day}
                onChange={(e) => handleInputChange('birth_day', e.target.value)}
                className={`w-full px-1 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
                placeholder="1-31"
                min="1"
                max="31"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Birth Month</label>
              <select
                value={formData.birth_month}
                onChange={(e) => handleInputChange('birth_month', e.target.value)}
                className={`w-full px-1 py-1 rounded border text-xs ${
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
              <label className="block text-xs mb-1">Age Bracket</label>
              <select
                value={formData.age_bracket}
                onChange={(e) => handleInputChange('age_bracket', e.target.value)}
                className={`w-full px-2 py-1 rounded border text-xs ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
                }`}
              >
                {AGE_BRACKET_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`px-4 py-1 text-xs border rounded transition-colors ${
              theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : (isEditMode ? 'Update Person' : 'Add Person')}
          </button>
        </div>
      </form>

      {/* Company Selection Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Select Companies</h3>
              <button
                type="button"
                onClick={() => setShowCompanyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="Search companies..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className={`w-full px-3 py-2 rounded border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-gray-100' 
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>

            {/* Company List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingCompanies ? (
                <div className="text-center py-4">Loading companies...</div>
              ) : (
                <div className="space-y-2">
                  {filteredCompanies.map((company) => (
                    <div
                      key={company.record_id}
                      className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
                        formData.attached_companies.includes(company.record_id)
                          ? theme === 'dark'
                            ? 'bg-blue-900/20 border-blue-500'
                            : 'bg-blue-50 border-blue-300'
                          : theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => handleCompanyToggle(company.record_id)}
                    >
                      {/* Company UID/Type Badge */}
                      {company.uid ? (
                        <div className={`px-2 py-1 rounded text-xs font-mono font-semibold ${
                          theme === 'dark' ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {company.uid}
                        </div>
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                          company.company_group_data_type === 'Company' 
                            ? 'bg-blue-100 text-blue-700'
                            : company.company_group_data_type === 'Group'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {company.company_group_data_type?.charAt(0) || 'C'}
                        </div>
                      )}

                      {/* Company Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{company.company_group_print_name}</span>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            company.company_group_data_type === 'Company' 
                              ? 'bg-blue-100 text-blue-700'
                              : company.company_group_data_type === 'Group'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {company.company_group_data_type || 'Company'}
                          </span>
                        </div>
                      </div>

                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        formData.attached_companies.includes(company.record_id)
                          ? 'bg-blue-600 border-blue-600'
                          : theme === 'dark'
                            ? 'border-gray-600'
                            : 'border-gray-300'
                      }`}>
                        {formData.attached_companies.includes(company.record_id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500">
                {formData.attached_companies.length} companies selected
              </div>
              <button
                type="button"
                onClick={() => setShowCompanyModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonAddForm;