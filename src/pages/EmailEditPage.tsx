import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useNavigation } from '../context/NavigationContext';
import EmailAddForm from '../components/EmailAddForm';
import apiClient from '../config/apiClient';

interface EmailFormData {
  email_address: string;
  is_active: 'Active' | 'Inactive';
}

interface EmailAssociation {
  association_id?: number;
  company_id?: number;
  departments?: string[];
  person_id?: number;
}

const EmailEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { navigateWithConfirm, setUnsavedChanges } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<Partial<EmailFormData>>({});
  const [initialAssociations, setInitialAssociations] = useState<EmailAssociation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [companies, setCompanies] = useState<{[key: number]: string}>({});
  const [persons, setPersons] = useState<{[key: number]: string}>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Connect local unsaved changes state to navigation context
  useEffect(() => {
    setUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setUnsavedChanges]);

  console.log('EmailEditPage: Component rendered with ID:', id);

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

  // Load existing email data
  useEffect(() => {
    const loadEmailData = async () => {
      if (!id) return;
      
      try {
        const response = await apiClient.get(`/emails/${id}`);
        if (response.ok) {
          const email = await response.json();
          console.log('EmailEditPage: Full email data received:', email);
          
          setInitialData({
            email_address: email.email_address,
            is_active: email.is_active || 'Active'
          });

          // Set associations if they exist
          if (email.associations) {
            console.log('EmailEditPage: Setting associations:', email.associations);
            setInitialAssociations(email.associations);
          }
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
    loadNamesData();
  }, [id, navigateWithConfirm]);

  const handleSubmit = async (formData: EmailFormData, associations: EmailAssociation[]) => {
    if (!id) return;
    
    // Clear unsaved changes flag immediately when user submits
    setHasUnsavedChanges(false);
    setLoading(true);
    try {
      // Step 1: Update the email data
      console.log('EmailEditPage: Updating email data');
      const emailResponse = await apiClient.put(`/emails/${id}`, formData);
      
      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => null);
        const errorMessage = errorData?.detail || `HTTP ${emailResponse.status}: ${emailResponse.statusText}`;
        throw new Error(errorMessage);
      }

      // Step 2: Handle associations - compare initial vs current
      console.log('EmailEditPage: Handling association updates');
      await handleAssociationUpdates(associations);
      
      console.log('Email and associations updated successfully');
      // Clear unsaved changes flag and navigate without confirmation since data was saved
      setHasUnsavedChanges(false);
      navigateWithConfirm('/emails');
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

  const handleAssociationUpdates = async (currentAssociations: EmailAssociation[]) => {
    if (!id) return;

    // Compare initial vs current associations to determine what changed
    // For department arrays, we need to compare company+person combinations
    const initialMap = new Map(initialAssociations.map(assoc => [
      `${assoc.company_id || ''}-${assoc.person_id || ''}`,
      assoc
    ]));
    
    const currentMap = new Map(currentAssociations.map(assoc => [
      `${assoc.company_id || ''}-${assoc.person_id || ''}`,
      assoc
    ]));

    // Find associations to delete (in initial but not in current)
    const toDelete = Array.from(initialMap.values()).filter(initial => {
      const key = `${initial.company_id || ''}-${initial.person_id || ''}`;
      return !currentMap.has(key);
    });

    // Find associations to create (in current but not in initial)  
    const toCreate = Array.from(currentMap.values()).filter(current => {
      const key = `${current.company_id || ''}-${current.person_id || ''}`;
      return !initialMap.has(key);
    });

    // Find associations to update (same company+person but different departments)
    const toUpdate = Array.from(currentMap.values()).filter(current => {
      const key = `${current.company_id || ''}-${current.person_id || ''}`;
      const initial = initialMap.get(key);
      if (initial) {
        // Compare departments arrays
        const initialDepts = initial.departments || [];
        const currentDepts = current.departments || [];
        return JSON.stringify(initialDepts.sort()) !== JSON.stringify(currentDepts.sort());
      }
      return false;
    });

    console.log('EmailEditPage: Association changes:', {
      toDelete: toDelete.length,
      toCreate: toCreate.length,
      toUpdate: toUpdate.length
    });
    console.log('EmailEditPage: Initial associations:', initialAssociations);
    console.log('EmailEditPage: Current associations:', currentAssociations);
    console.log('EmailEditPage: Detailed changes:', {
      toDelete: toDelete,
      toCreate: toCreate,
      toUpdate: toUpdate
    });

    // Delete removed associations
    for (const assoc of toDelete) {
      if (assoc.association_id) {
        console.log('EmailEditPage: Deleting association:', assoc.association_id);
        const deleteResponse = await apiClient.delete(`/emails/associations/${assoc.association_id}`);
        if (!deleteResponse.ok) {
          console.warn('Failed to delete association:', assoc.association_id);
        }
      }
    }

    // Update existing associations with new departments
    for (const assoc of toUpdate) {
      if (assoc.association_id) {
        console.log('EmailEditPage: Updating association:', assoc.association_id);
        const updateData = {
          company_id: assoc.company_id,
          person_id: assoc.person_id,
          departments: assoc.departments
        };
        console.log('EmailEditPage: Update data being sent:', updateData);
        const updateResponse = await apiClient.put(`/emails/associations/${assoc.association_id}`, updateData);
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('Failed to update association:', assoc.association_id, 'Error:', errorText);
        } else {
          console.log('EmailEditPage: Successfully updated association:', assoc.association_id);
        }
      }
    }

    // Create new associations
    for (const assoc of toCreate) {
      console.log('EmailEditPage: Creating association for email:', id);
      const createData = {
        company_id: assoc.company_id,
        person_id: assoc.person_id,
        departments: assoc.departments
      };
      console.log('EmailEditPage: Create data being sent:', createData);
      const createResponse = await apiClient.post(`/emails/${id}/associations`, createData);
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Failed to create association:', createData, 'Error:', errorText);
      } else {
        console.log('EmailEditPage: Successfully created new association');
      }
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
      initialAssociations={initialAssociations}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onChange={() => {
        if (!hasUnsavedChanges) {
          setHasUnsavedChanges(true);
        }
      }}
      loading={loading}
      isEditMode={true}
      companyLookup={companies}
      personLookup={persons}
    />
  );
};

export default EmailEditPage;