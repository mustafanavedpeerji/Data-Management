import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import EmailAddForm from '../components/EmailAddForm';
import apiClient from '../config/apiClient';

interface EmailFormData {
  email_address: string;
  email_type: string;
  description: string;
  is_active: 'Active' | 'Inactive';
}

interface EmailAssociation {
  company_id?: number;
  department?: string;
  person_id?: number;
  association_type?: string;
  notes?: string;
}

const EmailAddPage: React.FC = () => {
  const { navigateWithConfirm } = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: EmailFormData, associations: EmailAssociation[]) => {
    setLoading(true);
    try {
      const requestData = {
        email: formData,
        associations: associations
      };

      const response = await apiClient.post('/emails/', requestData);
      if (response.ok) {
        const responseData = await response.json();
        console.log('Email created successfully:', responseData);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Navigate to email list page
      navigateWithConfirm('/emails');
    } catch (error: any) {
      console.error('Error creating email:', error);
      
      let errorMessage = 'Error creating email';
      
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
    navigateWithConfirm('/emails');
  };

  return (
    <EmailAddForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      loading={loading}
      isEditMode={false}
    />
  );
};

export default EmailAddPage;