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
        <IndustryTree />
      </div>
    </>
  );
};

export default IndustryPage;
