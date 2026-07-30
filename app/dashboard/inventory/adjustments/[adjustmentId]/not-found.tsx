import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Adjustment not found"
        description="The requested adjustment does not exist."
        backHref="/dashboard/inventory/adjustments"
        backLabel="Back to Adjustments"
      />
    );
};

export default NotFoundPage;

