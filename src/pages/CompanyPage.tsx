import React, { useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import CompanyAddForm from "../components/CompanyAddForm";
import apiClient from "../config/apiClient";
import { useTheme } from "../context/ThemeContext";

// Success Modal Component
const SuccessModal: React.FC<{ isOpen: boolean; onClose: () => void; companyName: string }> = ({ 
  isOpen, 
  onClose, 
  companyName 
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
            Company Created Successfully!
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
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [savedCompanyName, setSavedCompanyName] = useState('');
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);

  const handleFormSubmit = async (formData: any) => {
    try {
      console.log('🔍 RAW FORM DATA received:', formData);
      console.log('🔍 Form Data Keys:', Object.keys(formData));
      console.log('🔍 Selected Industries:', formData.selected_industries);
      console.log('🔍 Ratings:', {
        financial_rating: formData.financial_rating,
        operational_rating: formData.operational_rating,
        compliance_rating: formData.compliance_rating,
        market_rating: formData.market_rating,
        innovation_rating: formData.innovation_rating
      });
      
      // Prepare the data for API submission - send all fields
      const submitData = {
        company_group_print_name: formData.company_group_print_name,
        company_group_data_type: formData.company_group_data_type,
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
        legal_name: formData.legal_name || null,
        other_names: formData.other_names || null,
        
        // Convert operations boolean to "Y"/"N" format
        imports: formData.operations?.imports ? "Y" : "N",
        exports: formData.operations?.exports ? "Y" : "N", 
        manufacture: formData.operations?.manufacture ? "Y" : "N",
        distribution: formData.operations?.distribution ? "Y" : "N",
        wholesale: formData.operations?.wholesale ? "Y" : "N",
        retail: formData.operations?.retail ? "Y" : "N",
        services: formData.operations?.services ? "Y" : "N",
        online: formData.operations?.online ? "Y" : "N",
        soft_products: formData.operations?.soft_products ? "Y" : "N",
        
        // Additional company details
        living_status: formData.living_status,
        ownership_type: formData.ownership_type,
        global_operations: formData.global_operations,
        founding_year: formData.founding_year || null,
        established_date: formData.established_date || null,
        company_size: formData.company_size,
        ntn_no: formData.ntn_no || null,
        
        // Industries
        selected_industries: formData.selected_industries,
        
        // Ratings
        financial_rating: formData.financial_rating,
        operational_rating: formData.operational_rating,
        compliance_rating: formData.compliance_rating,
        market_rating: formData.market_rating,
        innovation_rating: formData.innovation_rating
      };

      console.log('🚀 TRANSFORMED DATA for backend:', submitData);
      console.log('🚀 Submit Data Keys:', Object.keys(submitData));
      
      const response = await apiClient.post('/companies/', submitData);
      
      if (response.ok) {
        const savedCompany = await response.json();
        console.log('Company saved successfully:', savedCompany);
        
        // Show success modal
        setSavedCompanyName(formData.company_group_print_name);
        setSavedCompanyId(savedCompany.record_id || savedCompany.id);
        setIsSuccessModalOpen(true);
      } else {
        console.error('Failed to save company:', response.status, response.statusText);
        alert('Failed to save company. Please try again.');
      }
    } catch (error) {
      console.error('Error saving company:', error);
      alert('An error occurred while saving the company. Please try again.');
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

  return (
    <>
      <PageMeta
        title="Add Company"
        description="Create new companies, groups, and divisions"
      />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Company Page</h1>
      </div>
      <CompanyAddForm 
        onSubmit={handleFormSubmit}
        onCancel={() => navigate('/company')}
      />
      
      {/* Success Modal */}
      <SuccessModal 
        isOpen={isSuccessModalOpen}
        onClose={handleSuccessModalClose}
        companyName={savedCompanyName}
      />
    </>
  );
};

export default CompanyPage;