import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Business Partner not found"
        description="The requested business partner does not exist."
        backHref="/dashboard/business-partners"
        backLabel="Back to Business Partners"
      />
    );
};

export default NotFoundPage;