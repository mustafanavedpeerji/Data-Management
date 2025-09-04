import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import PageMeta from '../components/common/PageMeta';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import apiClient from '../config/apiClient';

interface Person {
  record_id: number;
  person_print_name: string;
  full_name: string;
  gender: 'Male' | 'Female';
  living_status: 'Active' | 'Dead' | 'Missing';
  professional_status?: string;
  religion?: string;
  community?: string;
  base_city?: string;
  attached_companies?: number[];
  department?: string;
  designation?: string;
  date_of_birth?: string;
  age_bracket?: string;
  nic?: string;
}

interface Company {
  record_id: number;
  company_group_print_name: string;
  uid?: string;
}

const PersonListPage = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { setUnsavedChanges } = useNavigation();
  const [persons, setPersons] = useState<Person[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Load persons
  const fetchPersons = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🚀 Loading persons...');
      
      const [personsResponse, companiesResponse] = await Promise.all([
        apiClient.get('/persons/'),
        apiClient.get('/companies/')
      ]);

      if (!personsResponse.ok) {
        throw new Error('Failed to fetch persons');
      }

      const personsData = await personsResponse.json();
      console.log('📊 Persons data:', personsData.length, 'items');
      setPersons(personsData);

      // Load companies for reference
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json();
        const actualCompanies = companiesData.filter((item: any) => 
          item.company_group_data_type === 'Company'
        );
        setCompanies(actualCompanies);
        console.log('📊 Companies data:', actualCompanies.length, 'items');
      }

      setError('');
    } catch (error) {
      setError('Failed to load persons data');
      console.error('Failed to load persons:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersons();
    // Clear any unsaved changes flag since this is a view-only page
    setUnsavedChanges(false);
  }, [fetchPersons, setUnsavedChanges]);

  // Filter persons based on search term
  const filteredPersons = persons.filter(person => {
    if (!searchTerm) return true;
    const lowerTerm = searchTerm.toLowerCase();
    return (
      person.person_print_name.toLowerCase().includes(lowerTerm) ||
      person.full_name.toLowerCase().includes(lowerTerm) ||
      person.designation?.toLowerCase().includes(lowerTerm) ||
      person.department?.toLowerCase().includes(lowerTerm) ||
      person.base_city?.toLowerCase().includes(lowerTerm) ||
      person.nic?.toLowerCase().includes(lowerTerm)
    );
  });

  const getCompanyName = (companyId: number): string => {
    const company = companies.find(c => c.record_id === companyId);
    return company?.company_group_print_name || `Company ${companyId}`;
  };

  const getCompanyUID = (companyId: number): string | undefined => {
    const company = companies.find(c => c.record_id === companyId);
    return company?.uid;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'dead':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'missing':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getGenderColor = (gender: string) => {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'female':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading persons...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-8">
            <div className="text-red-500 text-lg mb-2">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Persons</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchPersons}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <PageMeta 
        title="Persons" 
        description="Manage all persons in the system" 
      />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Persons
            </h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {filteredPersons.length} {filteredPersons.length === 1 ? 'person' : 'persons'} found
            </p>
          </div>
          <button
            onClick={() => navigate('/person')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Person
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search persons by name, designation, department, city, or NIC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400' 
                : 'bg-white border-gray-300 placeholder-gray-500'
            }`}
          />
        </div>

        {/* Persons List */}
        {filteredPersons.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">👤</div>
            <h3 className="text-lg font-medium mb-2">No persons found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first person'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPersons.map((person) => (
              <div
                key={person.record_id}
                className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer`}
                onClick={() => navigate(`/person/view/${person.record_id}`)}
              >
                <div className="flex items-center gap-4">
                  {/* Person Avatar/Initial */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    person.gender === 'Male' 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
                  }`}>
                    {person.person_print_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Person Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} truncate`}>
                        {person.person_print_name}
                      </h3>
                      {person.full_name !== person.person_print_name && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {person.full_name}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded ${getGenderColor(person.gender)}`}>
                        {person.gender}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(person.living_status)}`}>
                        {person.living_status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {person.designation && (
                        <span>💼 {person.designation}</span>
                      )}
                      {person.department && (
                        <span>🏢 {person.department}</span>
                      )}
                      {person.base_city && (
                        <span>📍 {person.base_city}</span>
                      )}
                      {person.age_bracket && (
                        <span>🎂 {person.age_bracket}</span>
                      )}
                      {person.nic && (
                        <span>🆔 {person.nic}</span>
                      )}
                    </div>

                    {/* Attached Companies */}
                    {person.attached_companies && person.attached_companies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {person.attached_companies.slice(0, 3).map((companyId) => (
                          <span
                            key={companyId}
                            className={`text-xs px-2 py-1 rounded ${
                              theme === 'dark' ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {getCompanyUID(companyId) || getCompanyName(companyId)}
                          </span>
                        ))}
                        {person.attached_companies.length > 3 && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            +{person.attached_companies.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/person/edit/${person.record_id}`);
                      }}
                      className={`p-2 rounded text-xs ${
                        theme === 'dark' 
                          ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      } transition-colors`}
                    >
                      ✏️
                    </button>
                    <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonListPage;