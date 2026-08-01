import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Payment Term not found"
        description="The requested payment term does not exist."
        backHref="/dashboard/settings/financial/payment-terms"
        backLabel="Back to Payment Terms"
      />
    );
};

export default NotFoundPage;