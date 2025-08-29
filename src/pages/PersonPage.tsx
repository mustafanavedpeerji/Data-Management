import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import PersonAddForm from '../components/PersonAddForm';
import apiClient from "../config/apiClient";
import { useNavigation } from '../context/NavigationContext';

// Success Modal Component
const SuccessModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}> = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

const PersonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { navigateWithConfirm } = useNavigation();

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isEditMode = Boolean(id);
  const editId = id ? parseInt(id) : null;

  // Load person data for editing
  const loadPersonData = useCallback(async (personId: number) => {
    try {
      setFormLoading(true);
      console.log(`Loading person data for ID: ${personId}`);
      
      const response = await apiClient.get(`/persons/${personId}`);
      const responseData = await response.json();
      console.log('Raw person data from API:', responseData);

      if (responseData) {
        const rawData = responseData;
        
        // Transform data for frontend form
        const transformedData = {
          person_print_name: rawData.person_print_name || '',
          full_name: rawData.full_name || '',
          gender: rawData.gender || 'Male',
          living_status: rawData.living_status || 'Active',
          professional_status: rawData.professional_status || '',
          religion: rawData.religion || '',
          community: rawData.community || '',
          base_city: rawData.base_city || '',
          birth_city: rawData.birth_city || '',
          date_of_birth: rawData.date_of_birth || '',
          age_bracket: rawData.age_bracket || '',
          nic: rawData.nic || ''
        };

        console.log('Transformed person data for form:', transformedData);
        setFormData(transformedData);
      }
    } catch (error) {
      console.error('Error loading person data:', error);
      alert('Error loading person data. Please try again.');
    } finally {
      setFormLoading(false);
    }
  }, []);

  // Load data when component mounts or ID changes
  useEffect(() => {
    if (isEditMode && editId) {
      loadPersonData(editId);
    } else {
      // New person - set empty form data
      setFormData({});
      setFormLoading(false);
    }
  }, [isEditMode, editId, loadPersonData]);

  // Handle form submission
  const handleFormSubmit = async (formData: any) => {
    try {
      console.log('RAW FORM DATA received:', formData);
      console.log('Form Data Keys:', Object.keys(formData));
      
      // Prepare the data for API submission
      const submitData: any = {
        person_print_name: formData.person_print_name || null,
        full_name: formData.full_name || null,
        gender: formData.gender,
        living_status: formData.living_status,
        professional_status: formData.professional_status || null,
        religion: formData.religion || null,
        community: formData.community || null,
        base_city: formData.base_city || null,
        birth_city: formData.birth_city || null,
        date_of_birth: formData.date_of_birth || null,
        age_bracket: formData.age_bracket || null,
        nic: formData.nic || null
      };

      console.log('TRANSFORMED DATA for backend:', submitData);
      console.log('Submit Data Keys:', Object.keys(submitData));
      
      // Validate required fields
      if (!submitData.person_print_name) {
        alert('Person Print Name is required');
        return;
      }
      if (!submitData.full_name) {
        alert('Full Name is required');
        return;
      }

      setLoading(true);
      
      let response;
      if (isEditMode && editId) {
        // Update existing person
        console.log(`Updating person with ID: ${editId}`);
        response = await apiClient.put(`/persons/${editId}`, submitData);
      } else {
        // Create new person
        console.log('Creating new person');
        response = await apiClient.post('/persons', submitData);
      }

      if (response.ok) {
        const savedPerson = await response.json();
        console.log(`Person ${isEditMode ? 'updated' : 'created'} successfully:`, savedPerson);
        
        setSuccessMessage(`Person ${isEditMode ? 'updated' : 'added'} successfully!`);
        setHasUnsavedChanges(false);
        setIsSuccessModalOpen(true);
      } else {
        // Handle error response
        const errorText = await response.text();
        let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} person.\n`;
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage += errorJson.detail;
          } else {
            errorMessage += errorText;
          }
        } catch {
          errorMessage += `Server error: ${response.status} ${response.statusText}`;
        }
        alert(errorMessage);
        return;
      }

    } catch (error: any) {
      console.error('Error submitting form:', error);
      
      if (error instanceof Response) {
        const errorText = await error.text();
        let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} person.\n`;
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage += errorJson.detail;
          } else {
            errorMessage += errorText;
          }
        } catch {
          errorMessage += `Server error: ${error.status} ${error.statusText}`;
        }
        alert(errorMessage);
      } else {
        alert(`Failed to ${isEditMode ? 'update' : 'create'} person. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle success modal close
  const handleSuccessModalClose = () => {
    setIsSuccessModalOpen(false);
    // Navigate to persons list after successful creation/update
    navigateWithConfirm('/person');
  };

  // If we're still loading form data, show loading state
  if (formLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {formData !== null ? (
        <PersonAddForm
          initialData={formData}
          onSubmit={handleFormSubmit}
          onCancel={() => navigateWithConfirm(isEditMode ? `/person/view/${editId}` : '/person')}
          onChange={() => {
            if (isEditMode && !hasUnsavedChanges) {
              setHasUnsavedChanges(true);
            }
          }}
          loading={loading}
          isEditMode={isEditMode}
        />
      ) : (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading form data...</p>
          </div>
        </div>
      )}
      
      {/* Success Modal */}
      <SuccessModal 
        isOpen={isSuccessModalOpen}
        onClose={handleSuccessModalClose}
        title={isEditMode ? "Person Updated" : "Person Added"}
        message={successMessage}
      />
    </div>
  );
};

export default PersonPage;