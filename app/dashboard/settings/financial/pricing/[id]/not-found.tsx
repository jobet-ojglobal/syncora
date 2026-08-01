import { NotFoundStateCard } from "@/components/shared/not-found-state-card";

const NotFoundPage = () => {
    return (
      <NotFoundStateCard
        title="Pricing Scheme not found"
        description="The requested pricing scheme does not exist."
        backHref="/dashboard/settings/financial/pricing"
        backLabel="Back to Strategy Directory"
      />
    );
};

export default NotFoundPage;