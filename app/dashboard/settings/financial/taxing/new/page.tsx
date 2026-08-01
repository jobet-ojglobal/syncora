import { Metadata } from 'next';
import { TaxingSchemeForm } from '@/components/taxing-scheme/taxing-scheme-form';
import PageHeader from '@/components/layout/dashboard/PageHeader';
import { ArrowLeft, Percent } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Create Taxing Scheme | Dashboard',
  description: 'Set up a new taxing scheme and configuration rules.',
};

export default function CreateTaxingSchemePage() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      {/* <Link
        href="/dashboard/settings/financial/taxing"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Taxing Scheme
      </Link> */}

      <PageHeader 
        title="Register New Taxing Scheme"
        description="Configure multi-tier regional tax calculation rules, handle cascading or compounding rates ($Tax2 \times [Subtotal + Tax1]$), and structure delivery freight tax criteria." 
        icon={Percent}
        className="border-b border-border pb-4"
      />
      {/* <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"> */}
        <TaxingSchemeForm />
      {/* </div> */}
    </div>
  );
}