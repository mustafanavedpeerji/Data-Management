import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useNavigation } from '../context/NavigationContext';
import CellPhoneAddForm from '../components/CellPhoneAddForm';
import apiClient from '../config/apiClient';

interface CellPhoneFormData {
  phone_number: string;
  is_active: 'Active' | 'Inactive';
}

interface CellPhoneAssociation {
  association_id?: number;
  company_id?: number;
  departments?: string[];
  person_id?: number;
}

const CellPhoneEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { navigateWithConfirm, setUnsavedChanges } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<Partial<CellPhoneFormData>>({});
  const [initialAssociations, setInitialAssociations] = useState<CellPhoneAssociation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [companies, setCompanies] = useState<{[key: number]: string}>({});
  const [persons, setPersons] = useState<{[key: number]: string}>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Connect local unsaved changes state to navigation context
  useEffect(() => {
    setUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setUnsavedChanges]);

  console.log('CellPhoneEditPage: Component rendered with ID:', id);

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

  // Load existing cell phone data
  useEffect(() => {
    const loadPhoneData = async () => {
      if (!id) return;
      
      try {
        const response = await apiClient.get(`/cell-phones/${id}`);
        if (response.ok) {
          const phone = await response.json();
          console.log('CellPhoneEditPage: Full phone data received:', phone);
          
          setInitialData({
            phone_number: phone.phone_number,
            is_active: phone.is_active || 'Active'
          });

          // Set associations if they exist
          if (phone.associations) {
            console.log('CellPhoneEditPage: Setting associations:', phone.associations);
            setInitialAssociations(phone.associations);
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error loading cell phone:', error);
        alert('Error loading cell phone data');
        navigateWithConfirm('/cell-phones');
      } finally {
        setDataLoading(false);
      }
    };

    loadPhoneData();
    loadNamesData();
  }, [id, navigateWithConfirm]);

  const handleSubmit = async (formData: CellPhoneFormData, associations: CellPhoneAssociation[]) => {
    if (!id) return;
    
    // Clear unsaved changes flag immediately when user submits
    setHasUnsavedChanges(false);
    setLoading(true);
    try {
      // Step 1: Update the cell phone data
      console.log('CellPhoneEditPage: Updating phone data');
      const phoneResponse = await apiClient.put(`/cell-phones/${id}`, formData);
      
      if (!phoneResponse.ok) {
        const errorData = await phoneResponse.json().catch(() => null);
        const errorMessage = errorData?.detail || `HTTP ${phoneResponse.status}: ${phoneResponse.statusText}`;
        throw new Error(errorMessage);
      }

      // Step 2: Handle associations - compare initial vs current
      console.log('CellPhoneEditPage: Handling association updates');
      await handleAssociationUpdates(associations);
      
      console.log('Cell phone and associations updated successfully');
      // Clear unsaved changes flag and navigate without confirmation since data was saved
      setHasUnsavedChanges(false);
      navigateWithConfirm('/cell-phones');
    } catch (error: any) {
      console.error('Error updating cell phone:', error);
      
      let errorMessage = 'Error updating cell phone';
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

  const handleAssociationUpdates = async (currentAssociations: CellPhoneAssociation[]) => {
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

    console.log('CellPhoneEditPage: Association changes:', {
      toDelete: toDelete.length,
      toCreate: toCreate.length,
      toUpdate: toUpdate.length
    });
    console.log('CellPhoneEditPage: Initial associations:', initialAssociations);
    console.log('CellPhoneEditPage: Current associations:', currentAssociations);
    console.log('CellPhoneEditPage: Detailed changes:', {
      toDelete: toDelete,
      toCreate: toCreate,
      toUpdate: toUpdate
    });

    // Delete removed associations
    for (const assoc of toDelete) {
      if (assoc.association_id) {
        console.log('CellPhoneEditPage: Deleting association:', assoc.association_id);
        const deleteResponse = await apiClient.delete(`/cell-phones/associations/${assoc.association_id}`);
        if (!deleteResponse.ok) {
          console.warn('Failed to delete association:', assoc.association_id);
        }
      }
    }

    // Update existing associations with new departments
    for (const assoc of toUpdate) {
      if (assoc.association_id) {
        console.log('CellPhoneEditPage: Updating association:', assoc.association_id);
        const updateData = {
          company_id: assoc.company_id,
          person_id: assoc.person_id,
          departments: assoc.departments
        };
        console.log('CellPhoneEditPage: Update data being sent:', updateData);
        const updateResponse = await apiClient.put(`/cell-phones/associations/${assoc.association_id}`, updateData);
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('Failed to update association:', assoc.association_id, 'Error:', errorText);
        } else {
          console.log('CellPhoneEditPage: Successfully updated association:', assoc.association_id);
        }
      }
    }

    // Create new associations
    for (const assoc of toCreate) {
      console.log('CellPhoneEditPage: Creating association for phone:', id);
      const createData = {
        company_id: assoc.company_id,
        person_id: assoc.person_id,
        departments: assoc.departments
      };
      console.log('CellPhoneEditPage: Create data being sent:', createData);
      const createResponse = await apiClient.post(`/cell-phones/${id}/associations`, createData);
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Failed to create association:', createData, 'Error:', errorText);
      } else {
        console.log('CellPhoneEditPage: Successfully created new association');
      }
    }
  };

  const handleCancel = () => {
    navigateWithConfirm('/cell-phones');
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading cell phone data...</div>
        </div>
      </div>
    );
  }

  return (
    <CellPhoneAddForm
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

export default CellPhoneEditPage;