import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Currency not found"
        description="The requested currency does not exist."
        backHref="/dashboard/settings/financial/currencies"
        backLabel="Back to Forex Ledger"
      />
    );
};

export default NotFoundPage;