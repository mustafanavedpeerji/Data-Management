import React from 'react';
import { useParams, useNavigate } from 'react-router';
import PersonView from '../components/PersonView';
import PageMeta from '../components/common/PageMeta';

const PersonViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleEdit = () => {
    navigate(`/person/edit/${id}`);
  };

  const handleBack = () => {
    navigate('/person-view');
  };

  return (
    <>
      <PageMeta 
        title={`Person Details`} 
        description="View detailed person information" 
      />
      <PersonView 
        personId={id}
        onEdit={handleEdit}
        onBack={handleBack}
      />
    </>
  );
};

export default PersonViewPage;