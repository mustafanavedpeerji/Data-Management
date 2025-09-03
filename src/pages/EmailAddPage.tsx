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
  const { navigate } = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: EmailFormData, associations: EmailAssociation[]) => {
    setLoading(true);
    try {
      const requestData = {
        email: formData,
        associations: associations
      };

      const response = await apiClient.post('/emails/', requestData);
      console.log('Email created successfully:', response.data);
      
      // Navigate to email list page
      navigate('/emails');
    } catch (error: any) {
      console.error('Error creating email:', error);
      
      let errorMessage = 'Error creating email';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/emails');
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