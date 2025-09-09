import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';
import EmailAddForm from '../components/EmailAddForm';
import apiClient from '../config/apiClient';

interface EmailFormData {
  email_address: string;
  is_active: 'Active' | 'Inactive';
}

interface EmailAssociation {
  company_id?: number;
  department?: string;
  person_id?: number;
  association_type?: string;
  notes?: string;
}

const EmailEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { navigateWithConfirm } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<Partial<EmailFormData>>({});
  const [dataLoading, setDataLoading] = useState(true);

  // Load existing email data
  useEffect(() => {
    const loadEmailData = async () => {
      if (!id) return;
      
      try {
        const response = await apiClient.get(`/emails/${id}`);
        if (response.ok) {
          const email = await response.json();
          
          setInitialData({
            email_address: email.email_address,
            is_active: email.is_active || 'Active'
          });
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error loading email:', error);
        alert('Error loading email data');
        navigateWithConfirm('/emails');
      } finally {
        setDataLoading(false);
      }
    };

    loadEmailData();
  }, [id, navigate]);

  const handleSubmit = async (formData: EmailFormData, associations: EmailAssociation[]) => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Update email data
      const response = await apiClient.put(`/emails/${id}`, formData);
      
      if (response.ok) {
        console.log('Email updated successfully');
        navigateWithConfirm('/emails');
      } else {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.detail || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error updating email:', error);
      
      let errorMessage = 'Error updating email';
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          errorMessage = errorData.detail || `HTTP ${error.status}: ${error.statusText}`;
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

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading email data...</div>
        </div>
      </div>
    );
  }

  return (
    <EmailAddForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      loading={loading}
      isEditMode={true}
    />
  );
};

export default EmailEditPage;