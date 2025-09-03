import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
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

const EmailEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { navigate } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<Partial<EmailFormData>>({});
  const [dataLoading, setDataLoading] = useState(true);

  // Load existing email data
  useEffect(() => {
    const loadEmailData = async () => {
      if (!id) return;
      
      try {
        const response = await apiClient.get(`/emails/${id}`);
        const email = response.data;
        
        setInitialData({
          email_address: email.email_address,
          email_type: email.email_type || 'business',
          description: email.description || '',
          is_active: email.is_active || 'Active'
        });
      } catch (error) {
        console.error('Error loading email:', error);
        alert('Error loading email data');
        navigate('/emails');
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
      await apiClient.put(`/emails/${id}`, formData);
      
      // For associations, we would need additional endpoints to manage them
      // This is a simplified version - in production you might want separate endpoints
      // to add/update/delete associations
      
      console.log('Email updated successfully');
      navigate('/emails');
    } catch (error: any) {
      console.error('Error updating email:', error);
      
      let errorMessage = 'Error updating email';
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