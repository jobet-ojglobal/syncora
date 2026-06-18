import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Product Group not found"
        description="The requested product group does not exist."
        backHref="/dashboard/groups"
        backLabel="Back to Product Groups"
      />
    );
};

export default NotFoundPage;