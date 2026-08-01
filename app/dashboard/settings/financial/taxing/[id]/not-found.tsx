import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Taxing Scheme not found"
        description="The requested taxing scheme does not exist."
        backHref="/dashboard/settings/financial/taxing"
        backLabel="Back to Taxing Scheme"
      />
    );
};

export default NotFoundPage;