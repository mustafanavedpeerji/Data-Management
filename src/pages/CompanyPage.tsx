import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router";
import PageMeta from "../components/common/PageMeta";
import CompanyAddForm from "../components/CompanyAddForm";
import apiClient from "../config/apiClient";
import { useTheme } from "../context/ThemeContext";
import { useNavigation } from "../context/NavigationContext";

// Success Modal Component
const SuccessModal: React.FC<{ isOpen: boolean; onClose: () => void; companyName: string; entityType?: string }> = ({ 
  isOpen, 
  onClose, 
  companyName,
  entityType = 'Company'
}) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-gray-900/50 animate-in fade-in-0 duration-300">
      <div className={`
        relative w-full max-w-md mx-4 rounded-2xl shadow-xl 
        ${theme === 'dark' 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
        }
        animate-in zoom-in-95 duration-300
      `}>
        {/* Content */}
        <div className="p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
            <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h3 className={`
            text-lg font-semibold mb-3
            ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}
          `}>
            {entityType} Created Successfully!
          </h3>
          
          <p className={`
            text-sm mb-6 leading-relaxed
            ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
          `}>
            <strong>{companyName}</strong> has been added to the system successfully.
          </p>
          
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="
                bg-brand-500 hover:bg-brand-600 text-white font-medium
                px-6 py-2 rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-sm
              "
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompanyPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: routeId } = useParams();
  const { setUnsavedChanges, navigateWithConfirm } = useNavigation();
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [savedCompanyName, setSavedCompanyName] = useState('');
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const [savedEntityType, setSavedEntityType] = useState<string>('Company');
  const [editCompanyData, setEditCompanyData] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Get edit ID from either route params or query params (for backward compatibility)
  const editId = routeId || searchParams.get('edit');

  useEffect(() => {
    if (editId) {
      console.log('Edit mode detected with ID:', editId);
      setIsEditMode(true);
      setIsLoadingEdit(true);
      loadCompanyForEdit(editId);
    } else {
      // Reset state when not in edit mode
      console.log('Not in edit mode, resetting state');
      setIsEditMode(false);
      setEditCompanyData(null);
      setIsLoadingEdit(false);
      setHasUnsavedChanges(false);
      setUnsavedChanges(false);
    }
  }, [editId, setUnsavedChanges]);

  // Sync hasUnsavedChanges with navigation context
  useEffect(() => {
    setUnsavedChanges(hasUnsavedChanges && isEditMode);
  }, [hasUnsavedChanges, isEditMode, setUnsavedChanges]);

  // Warn user about unsaved changes when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && isEditMode) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges && isEditMode) {
        // For back button, still use browser confirm since we can't easily show modal
        const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
        if (!confirmLeave) {
          // Push the current state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    if (isEditMode && hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges, isEditMode]);

  // Note: useBlocker is not supported in current React Router setup
  // Unsaved changes warning is handled via beforeunload and popstate events above

  const loadCompanyForEdit = async (companyId: string) => {
    try {
      // First, try to load from companies
      let response = await apiClient.get(`/companies/${companyId}`);
      
      if (!response.ok) {
        // If not found in companies, try divisions
        response = await apiClient.get(`/divisions/${companyId}`);
      }
      
      if (!response.ok) {
        // If not found in divisions, try groups
        response = await apiClient.get(`/groups/${companyId}`);
      }

      if (response.ok) {
        const rawData = await response.json();
        console.log('Loaded raw company data for editing:', rawData);
        console.log('Raw selected_industries from backend:', rawData.selected_industries, 'Type:', typeof rawData.selected_industries);
        
        // Transform the data based on entity type to match form structure
        const transformedData: any = {
          legal_name: rawData.legal_name,
          other_names: rawData.other_names,
          parent_id: rawData.parent_id,
          living_status: rawData.living_status || 'Active',
          // Initialize selected_industries as array for all entity types
          selected_industries: (() => {
            if (!rawData.selected_industries) return [];
            if (Array.isArray(rawData.selected_industries)) return rawData.selected_industries;
            if (typeof rawData.selected_industries === 'string') {
              try {
                const parsed = JSON.parse(rawData.selected_industries);
                return Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                console.warn('Failed to parse selected_industries string:', rawData.selected_industries);
                return [];
              }
            }
            return [];
          })(),
        };

        // Handle different entity types
        if (rawData.group_print_name) {
          // Group data
          transformedData.company_group_data_type = 'Group';
          transformedData.company_group_print_name = rawData.group_print_name;
        } else if (rawData.division_print_name) {
          // Division data
          transformedData.company_group_data_type = 'Division';
          transformedData.company_group_print_name = rawData.division_print_name;
          transformedData.parent_type = rawData.parent_type;
        } else {
          // Company data - add all company-specific fields
          transformedData.company_group_data_type = 'Company';
          transformedData.company_group_print_name = rawData.company_group_print_name;
          
          // Operations - use the operations object from backend
          transformedData.operations = rawData.operations || {
            imports: false, exports: false, manufacture: false,
            distribution: false, wholesale: false, retail: false,
            services: false, online: false, soft_products: false,
          };
          
          // Company details - convert null to "None" for frontend
          transformedData.ownership_type = rawData.ownership_type || 'None';
          transformedData.global_operations = rawData.global_operations || 'None';
          transformedData.founding_year = rawData.founding_year;
          transformedData.established_day = rawData.established_day;
          transformedData.established_month = rawData.established_month;
          transformedData.company_size = rawData.company_size;
          transformedData.ntn_no = rawData.ntn_no;
          // Handle websites array - ensure it's always an array
          transformedData.websites = (() => {
            if (!rawData.websites) return [''];
            if (Array.isArray(rawData.websites)) return rawData.websites.length > 0 ? rawData.websites : [''];
            if (typeof rawData.websites === 'string') {
              try {
                const parsed = JSON.parse(rawData.websites);
                return Array.isArray(parsed) && parsed.length > 0 ? parsed : [''];
              } catch (e) {
                return rawData.websites ? [rawData.websites] : [''];
              }
            }
            return [''];
          })();
          
          // Ratings
          transformedData.company_brand_image = rawData.company_brand_image;
          transformedData.company_business_volume = rawData.company_business_volume;
          transformedData.company_financials = rawData.company_financials;
          transformedData.iisol_relationship = rawData.iisol_relationship;
        }

        console.log('Transformed data for form:', transformedData);
        console.log('Final selected_industries for form:', transformedData.selected_industries);
        setEditCompanyData(transformedData);
      } else {
        console.error('Company not found');
        alert('Company not found');
        navigate('/company-view');
      }
    } catch (error) {
      console.error('Error loading company for edit:', error);
      alert('Error loading company data');
      navigate('/company-view');
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      console.log('🔍 RAW FORM DATA received:', formData);
      console.log('🔍 Form Data Keys:', Object.keys(formData));
      console.log('🔍 Selected Industries:', formData.selected_industries, 'Type:', typeof formData.selected_industries, 'Length:', formData.selected_industries?.length);
      console.log('🔍 Ratings:', {
        company_brand_image: formData.company_brand_image,
        company_business_volume: formData.company_business_volume,
        company_financials: formData.company_financials,
        iisol_relationship: formData.iisol_relationship
      });
      
      // Prepare the data for API submission with correct field names for each entity type
      const submitData: any = {
        legal_name: formData.legal_name || null,
        other_names: formData.other_names || null,
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
        living_status: formData.living_status,
      };

      // Set the correct name field based on entity type
      if (formData.company_group_data_type === 'Group') {
        submitData.group_print_name = formData.company_group_print_name;
      } else if (formData.company_group_data_type === 'Division') {
        submitData.division_print_name = formData.company_group_print_name;
        // Divisions also need parent_type
        if (submitData.parent_id) {
          submitData.parent_type = 'Group'; // Default to Group for now
        }
      } else {
        // Company - add all company-specific fields
        submitData.company_group_print_name = formData.company_group_print_name;
        submitData.company_group_data_type = formData.company_group_data_type;
        
        // Send operations as object for backend processing
        submitData.operations = formData.operations;
        
        // Additional company details - convert "None" to null
        submitData.ownership_type = formData.ownership_type === 'None' ? null : formData.ownership_type;
        submitData.global_operations = formData.global_operations === 'None' ? null : formData.global_operations;
        submitData.founding_year = formData.founding_year || null;
        submitData.established_day = formData.established_day || null;
        submitData.established_month = formData.established_month || null;
        submitData.company_size = formData.company_size;
        submitData.ntn_no = formData.ntn_no || null;
        // Convert websites array - filter out empty strings and only send if there are valid URLs
        const validWebsites = formData.websites?.filter(website => website && website.trim()) || [];
        submitData.websites = validWebsites.length > 0 ? validWebsites : null;
        
        // Industries - convert array to JSON string for database storage
        submitData.selected_industries = JSON.stringify(formData.selected_industries);
        
        // Ratings
        submitData.company_brand_image = formData.company_brand_image;
        submitData.company_business_volume = formData.company_business_volume;
        submitData.company_financials = formData.company_financials;
        submitData.iisol_relationship = formData.iisol_relationship;
      }

      console.log('🚀 TRANSFORMED DATA for backend:', submitData);
      console.log('🚀 Submit Data Keys:', Object.keys(submitData));
      console.log('🚀 Ownership Type:', submitData.ownership_type, 'Type:', typeof submitData.ownership_type);
      console.log('🚀 Global Operations:', submitData.global_operations, 'Type:', typeof submitData.global_operations);
      
      // Validate required fields
      const printName = submitData.company_group_print_name || submitData.group_print_name || submitData.division_print_name;
      if (!printName) {
        alert(`${formData.company_group_data_type} Print Name is required`);
        return;
      }
      if (!submitData.legal_name) {
        alert('Legal Name is required');
        return;
      }
      
      // Route to the correct API endpoint based on entity type
      let apiEndpoint;
      switch (formData.company_group_data_type) {
        case 'Group':
          apiEndpoint = '/groups/';
          break;
        case 'Division':
          apiEndpoint = '/divisions/';
          break;
        case 'Company':
        default:
          apiEndpoint = '/companies/';
          break;
      }

      console.log(`🚀 Submitting ${formData.company_group_data_type} to endpoint: ${apiEndpoint}`);
      
      let response;
      if (isEditMode && editId) {
        // Update existing entity - use correct endpoint format
        const updateEndpoint = apiEndpoint.endsWith('/') ? `${apiEndpoint}${editId}/` : `${apiEndpoint}${editId}`;
        console.log(`🔄 Updating ${formData.company_group_data_type} with ID: ${editId} to endpoint: ${updateEndpoint}`);
        console.log(`🔄 Update payload:`, submitData);
        response = await apiClient.put(updateEndpoint, submitData);
      } else {
        // Create new entity
        console.log(`➕ Creating new ${formData.company_group_data_type} to endpoint: ${apiEndpoint}`);
        console.log(`➕ Create payload:`, submitData);
        response = await apiClient.post(apiEndpoint, submitData);
      }
      
      if (response.ok) {
        const savedCompany = await response.json();
        console.log(`${formData.company_group_data_type} ${isEditMode ? 'updated' : 'saved'} successfully:`, savedCompany);
        
        // Clear unsaved changes flag on successful save
        setHasUnsavedChanges(false);
        setUnsavedChanges(false);
        
        if (isEditMode) {
          // For edit mode, redirect back to view page immediately
          navigate(`/company/view/${editId}`);
        } else {
          // For create mode, show success modal
          setSavedCompanyName(formData.company_group_print_name);
          setSavedCompanyId(savedCompany.record_id || savedCompany.id);
          setSavedEntityType(formData.company_group_data_type);
          setIsSuccessModalOpen(true);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          response: errorText,
          url: response.url
        });
        
        // Log the raw response first
        console.error('❌ Raw response text:', errorText);
        
        let errorMessage = `Failed to ${isEditMode ? 'update' : 'save'} ${formData.company_group_data_type.toLowerCase()}. `;
        
        // Add detailed error information
        console.error('❌ Complete error details:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries()),
          responseBody: errorText
        });
        
        try {
          const errorJson = JSON.parse(errorText);
          console.error('❌ Parsed error JSON:', errorJson);
          
          if (errorJson.detail && Array.isArray(errorJson.detail)) {
            // Handle Pydantic validation errors
            const validationErrors = errorJson.detail.map(err => {
              const field = err.loc ? err.loc.join('.') : 'Unknown field';
              return `${field}: ${err.msg}`;
            });
            errorMessage += validationErrors.join('\n');
          } else if (errorJson.detail) {
            errorMessage += errorJson.detail;
          } else if (errorJson.message) {
            errorMessage += errorJson.message;
          } else if (Array.isArray(errorJson)) {
            errorMessage += errorJson.map(err => typeof err === 'string' ? err : JSON.stringify(err, null, 2)).join(', ');
          } else {
            // Better formatting for complex objects
            errorMessage += JSON.stringify(errorJson, null, 2);
          }
        } catch (e) {
          console.error('❌ Error parsing JSON:', e);
          errorMessage += `Server error: ${response.status} ${response.statusText}\nResponse: ${errorText.substring(0, 500)}`;
        }
        
        console.error('❌ Final error message:', errorMessage);
        alert(errorMessage);
      }
    } catch (error) {
      console.error(`Error saving ${formData.company_group_data_type.toLowerCase()}:`, error);
      alert(`An error occurred while saving the ${formData.company_group_data_type.toLowerCase()}. Please try again.`);
    }
  };

  const handleSuccessModalClose = () => {
    setIsSuccessModalOpen(false);
    // Redirect to view page
    if (savedCompanyId) {
      navigate(`/company/view/${savedCompanyId}`);
    } else {
      // Fallback: redirect to company list or stay on current page
      navigate('/company');
    }
  };

  // Show loading screen while loading edit data
  if (isEditMode && isLoadingEdit) {
    return (
      <>
        <PageMeta
          title="Loading..."
          description="Loading company data for editing"
        />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Loading Company Data</h3>
            <p className="text-gray-600 dark:text-gray-400">Please wait while we load the company information...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageMeta
        title={isEditMode ? "Edit Company" : "Add Company"}
        description={isEditMode ? "Edit existing companies, groups, and divisions" : "Create new companies, groups, and divisions"}
      />
      {/* Only render form when not in edit mode OR when edit data is loaded */}
      {(!isEditMode || editCompanyData) ? (
        <CompanyAddForm 
          key={isEditMode ? `edit-${editId}` : 'create'} // Force re-render on mode change
          initialData={editCompanyData}
          isEditMode={isEditMode}
          onSubmit={handleFormSubmit}
          onCancel={() => navigateWithConfirm(isEditMode ? `/company/view/${editId}` : '/company')}
          onChange={() => {
            if (isEditMode && !hasUnsavedChanges) {
              setHasUnsavedChanges(true);
            }
          }}
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
        companyName={savedCompanyName}
        entityType={savedEntityType}
      />
    </div>
  );
};

export default CompanyPage;