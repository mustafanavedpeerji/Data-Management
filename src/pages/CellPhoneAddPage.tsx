import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import CellPhoneAddForm from '../components/CellPhoneAddForm';
import apiClient from '../config/apiClient';

interface CellPhoneFormData {
  phone_number: string;
  is_active: 'Active' | 'Inactive';
}

interface CellPhoneAssociation {
  company_id?: number;
  departments?: string[];
  person_id?: number;
  gender?: 'Male' | 'Female';
  city?: string;
}

const CellPhoneAddPage: React.FC = () => {
  const { navigateWithConfirm, setUnsavedChanges } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Connect local unsaved changes state to navigation context
  useEffect(() => {
    setUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setUnsavedChanges]);

  const handleSubmit = async (formData: CellPhoneFormData, associations: CellPhoneAssociation[]) => {
    // Clear unsaved changes flag immediately when user submits
    setHasUnsavedChanges(false);
    setLoading(true);
    try {
      const requestData = {
        phone: formData,
        associations: associations
      };

      console.log('CellPhoneAddPage: Sending request data:', JSON.stringify(requestData, null, 2));
      
      const response = await apiClient.post('/cell-phones/', requestData);
      if (response.ok) {
        const responseData = await response.json();
        console.log('Cell phone created successfully:', responseData);
      } else {
        // Log the error response for debugging
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Clear unsaved changes flag and navigate to cell phone list page
      setHasUnsavedChanges(false);
      navigateWithConfirm('/cell-phones');
    } catch (error: any) {
      console.error('Error creating cell phone:', error);
      
      let errorMessage = 'Error creating cell phone';
      
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
    navigateWithConfirm('/cell-phones');
  };

  return (
    <CellPhoneAddForm
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

export default CellPhoneAddPage;