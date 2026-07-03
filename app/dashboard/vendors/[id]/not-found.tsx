import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Vendor not found"
        description="The requested vendor does not exist."
        backHref="/dashboard/vendors"
        backLabel="Back to Vendors"
      />
    );
};

export default NotFoundPage;