import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Inventory not found"
        description="The requested inventory does not exist."
        backHref="/dashboard/inventory"
        backLabel="Back to Inventory"
      />
    );
};

export default NotFoundPage;

