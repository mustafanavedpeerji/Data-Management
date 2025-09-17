import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import LocationAddForm from '../components/LocationAddForm';
import apiClient from '../config/apiClient';

interface LocationFormData {
  location_name: string;
  address?: string;
  description?: string;
}

interface LocationAssociation {
  company_id?: number;
  departments?: string[];
  person_id?: number;
}

const LocationAddPage: React.FC = () => {
  const { navigateWithConfirm, setUnsavedChanges } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Connect local unsaved changes state to navigation context
  useEffect(() => {
    setUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setUnsavedChanges]);

  const handleSubmit = async (formData: LocationFormData, associations: LocationAssociation[]) => {
    // Clear unsaved changes flag immediately when user submits
    setHasUnsavedChanges(false);
    setLoading(true);
    try {
      const requestData = {
        location: formData,
        associations: associations
      };

      console.log('LocationAddPage: Sending request data:', JSON.stringify(requestData, null, 2));
      
      const response = await apiClient.post('/locations/', requestData);
      if (response.ok) {
        const responseData = await response.json();
        console.log('Location created successfully:', responseData);
      } else {
        // Log the error response for debugging
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Clear unsaved changes flag and navigate to location list page
      setHasUnsavedChanges(false);
      navigateWithConfirm('/locations');
    } catch (error: any) {
      console.error('Error creating location:', error);
      
      let errorMessage = 'Error creating location';
      
      // Handle fetch API errors
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          if (errorData.detail) {
            errorMessage = Array.isArray(errorData.detail)
              ? errorData.detail.map((err: any) => `${err.loc?.join('.') || 'Field'}: ${err.msg}`).join(', ')
              : errorData.detail;
          }
        } catch {
          errorMessage = `HTTP ${error.status}: ${error.statusText}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigateWithConfirm('/locations');
  };

  return (
    <LocationAddForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onChange={() => {
        if (!hasUnsavedChanges) {
          setHasUnsavedChanges(true);
        }
      }}
      loading={loading}
      isEditMode={false}
    />
  );
};

export default LocationAddPage;