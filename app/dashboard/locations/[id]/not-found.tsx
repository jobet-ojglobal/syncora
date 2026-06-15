import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Location not found"
        description="The requested location does not exist."
        backHref="/dashboard/locations"
        backLabel="Back to Locations"
      />
    );
};

export default NotFoundPage;