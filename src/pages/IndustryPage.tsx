import PageMeta from "../components/common/PageMeta";
import IndustryTree from "../components/IndustryTree";

const IndustryPage = () => {
  return (
    <>
      <PageMeta
        title="Industry Management"
        description="Industry Tree Page"
      />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Industry Page</h1>
        <IndustryTree />
      </div>
    </>
  );
};

export default IndustryPage;
