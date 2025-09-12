import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import apiClient from '../config/apiClient';

interface CellPhone {
  phone_id: number;
  phone_number: string;
  description?: string;
  is_active: string;
  created_at: string;
  updated_at?: string;
}

interface CellPhoneWithAssociations extends CellPhone {
  associations: Array<{
    association_id: number;
    company_id?: number;
    departments?: string[];
    person_id?: number;
  }>;
}

const CellPhonePage: React.FC = () => {
  const { theme } = useTheme();
  const { navigateWithConfirm } = useNavigation();
  const [phones, setPhones] = useState<CellPhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhone, setSelectedPhone] = useState<CellPhoneWithAssociations | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [companies, setCompanies] = useState<{[key: number]: string}>({});
  const [persons, setPersons] = useState<{[key: number]: string}>({});

  // Load cell phones
  const loadPhones = async (search: string = '') => {
    setLoading(true);
    try {
      const endpoint = search 
        ? `/cell-phones/search?q=${encodeURIComponent(search)}`
        : '/cell-phones/all';
      const response = await apiClient.get(endpoint);
      if (response.ok) {
        const responseData = await response.json();
        setPhones(responseData);
      }
    } catch (error) {
      console.error('Error loading cell phones:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load companies and persons for name lookup
  const loadNamesData = async () => {
    try {
      // Load companies
      const companiesResponse = await apiClient.get('/companies/all');
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json();
        const companiesMap = companiesData.reduce((acc: {[key: number]: string}, company: any) => {
          acc[company.record_id] = company.company_group_print_name;
          return acc;
        }, {});
        setCompanies(companiesMap);
      }

      // Load persons
      const personsResponse = await apiClient.get('/persons/all');
      if (personsResponse.ok) {
        const personsData = await personsResponse.json();
        const personsMap = personsData.reduce((acc: {[key: number]: string}, person: any) => {
          acc[person.record_id] = person.person_print_name;
          return acc;
        }, {});
        setPersons(personsMap);
      }
    } catch (error) {
      console.error('Error loading names data:', error);
    }
  };

  // Load cell phone details
  const loadPhoneDetails = async (phoneId: number) => {
    try {
      const response = await apiClient.get(`/cell-phones/${phoneId}`);
      if (response.ok) {
        const responseData = await response.json();
        setSelectedPhone(responseData);
      }
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading cell phone details:', error);
    }
  };

  // Delete cell phone
  const deletePhone = async (phoneId: number) => {
    if (window.confirm('Are you sure you want to delete this cell phone? This will also delete all its associations.')) {
      try {
        await apiClient.delete(`/cell-phones/${phoneId}`);
        loadPhones(searchTerm);
        if (selectedPhone?.phone_id === phoneId) {
          setShowDetailsModal(false);
          setSelectedPhone(null);
        }
      } catch (error) {
        console.error('Error deleting cell phone:', error);
        alert('Error deleting cell phone');
      }
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPhones(searchTerm);
  };

  // Initial load
  useEffect(() => {
    loadPhones();
    loadNamesData();
  }, []);

  // Group associations by company for better display
  const groupAssociations = (associations: any[]) => {
    const companyGroups: { [key: string]: any[] } = {};
    const personAssociations: any[] = [];
    
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
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-boxdark text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Cell Phone Management</h1>
          <button
            onClick={() => navigateWithConfirm('/cell-phones/add')}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors"
          >
            Add Cell Phone
          </button>
        </div>

        {/* Cell Phone List */}
        <div className={`${theme === 'dark' ? 'bg-boxdark-2' : 'bg-white'} rounded-lg shadow-sm p-6`}>
            {/* Search */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search cell phones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-md ${
                    theme === 'dark'
                      ? 'bg-boxdark border-strokedark text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Cell Phone List */}
            {loading ? (
              <div className="text-center py-8">Loading cell phones...</div>
            ) : phones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No cell phones found</div>
            ) : (
              <div className="space-y-3">
                {phones.map((phone) => (
                  <div
                    key={phone.phone_id}
                    className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all ${
                      theme === 'dark'
                        ? 'border-strokedark hover:bg-boxdark hover:border-primary'
                        : 'border-gray-200 hover:bg-gray-50 hover:border-primary'
                    }`}
                    onClick={() => loadPhoneDetails(phone.phone_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="font-medium">{phone.phone_number}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            phone.is_active === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {phone.is_active}
                          </span>
                        </div>
                        {phone.description && (
                          <p className="text-sm text-gray-600 truncate">{phone.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(phone.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateWithConfirm(`/cell-phones/edit/${phone.phone_id}`);
                          }}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePhone(phone.phone_id);
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>

      {/* Cell Phone Details Modal */}
      {showDetailsModal && selectedPhone && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${theme === 'dark' ? 'bg-boxdark-2 border-strokedark' : 'bg-white border-gray-200'} border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col animate-in slide-in-from-bottom-4 duration-300`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="text-xl font-semibold">Cell Phone Details</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateWithConfirm(`/cell-phones/edit/${selectedPhone.phone_id}`)}
                  className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-green-600 dark:text-green-400">Basic Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Phone Number</label>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <p className="font-medium text-lg">{selectedPhone.phone_number}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      selectedPhone.is_active === 'Active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {selectedPhone.is_active}
                    </span>
                  </div>
                  
                  {selectedPhone.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                      <p className="text-sm">{selectedPhone.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Created</label>
                      <p className="text-sm">{new Date(selectedPhone.created_at).toLocaleString()}</p>
                    </div>
                    
                    {selectedPhone.updated_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Updated</label>
                        <p className="text-sm">{new Date(selectedPhone.updated_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Associations */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-purple-600 dark:text-purple-400">
                    Associations ({selectedPhone.associations?.length || 0})
                  </h4>
                  
                  {selectedPhone.associations && selectedPhone.associations.length > 0 ? (
                    (() => {
                      const { companyGroups, personAssociations } = groupAssociations(selectedPhone.associations);
                      const hasCompanyAssociations = Object.keys(companyGroups).length > 0;
                      const hasPersonAssociations = personAssociations.length > 0;

                      return (
                        <div className="space-y-4">
                          {/* Company & Departments */}
                          {hasCompanyAssociations && (
                            <div>
                              <h5 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 border-b border-green-200 dark:border-green-700 pb-1">
                                🏢 Companies & Departments
                              </h5>
                              <div className="space-y-2">
                                {Object.entries(companyGroups).map(([companyKey, groupAssocs]) => {
                                  const isUnknownCompany = companyKey === 'unknown_company';
                                  const companyName = isUnknownCompany 
                                    ? 'Unknown Company' 
                                    : companies[parseInt(companyKey)] || `Company ${companyKey}`;
                                  
                                  // Separate company-only vs company+departments associations
                                  const companyOnlyAssocs = groupAssocs.filter(a => !a.departments || a.departments.length === 0);
                                  const deptAssocs = groupAssocs.filter(a => a.departments && a.departments.length > 0);
                                  
                                  return (
                                    <div
                                      key={companyKey}
                                      className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-green-50 border-green-200'}`}
                                    >
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <span className="font-medium text-green-700 dark:text-green-300">
                                          {companyName}
                                        </span>
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
                                            {deptAssocs.flatMap(assoc => 
                                              (assoc.departments || []).map((dept, idx) => (
                                                <span
                                                  key={`${assoc.association_id}-${idx}`}
                                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'}`}
                                                >
                                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                  {dept}
                                                </span>
                                              ))
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Persons */}
                          {hasPersonAssociations && (
                            <div>
                              <h5 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 border-b border-purple-200 dark:border-purple-700 pb-1">
                                👤 Persons
                              </h5>
                              <div className="space-y-2">
                                {personAssociations.map((assoc, index) => (
                                  <div
                                    key={index}
                                    className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-purple-50 border-purple-200'}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                      <span className="font-medium text-purple-700 dark:text-purple-300">
                                        {persons[assoc.person_id] || `Person ${assoc.person_id}`}
                                      </span>
                                    </div>
                                    {assoc.notes && (
                                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                        Note: {assoc.notes}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                      <div className="text-sm">No associations found</div>
                      <div className="text-xs mt-1">This cell phone is not associated with any companies or persons</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="text-sm text-gray-500">
                Phone ID: {selectedPhone.phone_id}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    deletePhone(selectedPhone.phone_id);
                  }}
                  className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className={`px-4 py-1 text-sm rounded-md transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CellPhonePage;