import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Brand not found"
        description="The requested brand does not exist."
        backHref="/dashboard/brands"
        backLabel="Back to Brands"
      />
    );
};

export default NotFoundPage;