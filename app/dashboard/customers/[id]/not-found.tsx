import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Customer not found"
        description="The requested customer does not exist."
        backHref="/dashboard/customers"
        backLabel="Back to Customer"
      />
    );
};

export default NotFoundPage;