import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Category not found"
        description="The requested category does not exist."
        backHref="/dashboard/categories"
        backLabel="Back to Categories"
      />
    );
};

export default NotFoundPage;