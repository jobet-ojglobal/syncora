import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Product not found"
        description="The requested product does not exist."
        backHref="/dashboard/products"
        backLabel="Back to Products"
      />
    );
};

export default NotFoundPage;