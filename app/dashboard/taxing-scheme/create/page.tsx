import { Metadata } from 'next';
import { TaxingSchemeForm } from '@/components/taxing-scheme/taxing-scheme-form';
import PageHeader from '@/components/layout/dashboard/PageHeader';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Create Taxing Scheme | Dashboard',
  description: 'Set up a new taxing scheme and configuration rules.',
};

export default function CreateTaxingSchemePage() {
  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* NAVIGATION CONTROLS */}
      <Link
        href="/dashboard/taxing-scheme"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Taxing Scheme
      </Link>
      <PageHeader
        title="Create Taxing Scheme"
        description="Set up a new regional or category-specific tax structure." 
      />
      <TaxingSchemeForm />
    </div>
  );
}