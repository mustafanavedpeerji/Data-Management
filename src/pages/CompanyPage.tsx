import PageMeta from "../components/common/PageMeta";
import CompanyTree from "../components/CompanyTree";

const CompanyPage = () => {
  return (
    <>
      <PageMeta
        title="Company Management"
        description="Company Tree Page"
      />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Company Management</h1>
        <CompanyTree />
      </div>
    </>
  );
};

export default CompanyPage;