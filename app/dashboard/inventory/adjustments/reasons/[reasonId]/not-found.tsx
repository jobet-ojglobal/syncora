import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Adjustment Reason not found"
        description="The requested adjustment reason does not exist."
        backHref="/dashboard/inventory/adjustments/reasons"
        backLabel="Back to Adjustment Reasons"
      />
    );
};

export default NotFoundPage;

