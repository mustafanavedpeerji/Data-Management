import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import PageMeta from '../components/common/PageMeta';
import CompanyView from '../components/CompanyView';

const CompanyViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('CompanyViewPage rendered with ID:', id);
  }, [id]);

  const handleEdit = () => {
    navigate(`/company/edit/${id}`);
  };

  const handleBack = () => {
    navigate('/company-view');
  };

  // Debug: Show loading state if no ID
  if (!id) {
    return (
      <>
        <PageMeta
          title="View Company"
          description="View company details and information"
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">No Company ID</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">No company ID provided in URL</p>
            <button
              onClick={() => navigate('/company-view')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Company List
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="View Company"
        description="View company details and information"
      />
      <div className="min-h-screen">
        <CompanyView 
          companyId={id}
          onEdit={handleEdit}
          onBack={handleBack}
        />
      </div>
    </>
  );
};

export default CompanyViewPage;