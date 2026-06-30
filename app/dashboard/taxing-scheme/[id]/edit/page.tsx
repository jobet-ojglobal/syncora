import PageHeader from '@/components/layout/dashboard/PageHeader';
import { TaxingSchemeForm } from '@/components/taxing-scheme/taxing-scheme-form';
import { ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// Replace this with your actual DB/API fetching logic
async function getTaxingScheme(id: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/taxing-schemes/${id}`, {
      next: { revalidate: 0 }, // Ensure fresh data for editing
    });
    
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('Failed to fetch taxing scheme:', error);
    return null;
  }
}

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Edit Taxing Scheme ${id} | Dashboard` };
}

export default async function EditTaxingSchemePage({ params }: Props) {
  const { id } = await params;
  const taxingScheme = await getTaxingScheme(id);

  if (!taxingScheme) {
    notFound();
  }

  return (
    <div className="w-full max-w-xl mx-auto p-6 space-y-6">
        {/* HEADER */}
        <Link
          href="/dashboard/categories"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Taxing Scheme
        </Link>
        <PageHeader
          title="Edit Taxing Scheme" 
          description="Modify rules, rates, or exemptions for this scheme." 
        />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {/* <TaxingSchemeForm initialData={taxingScheme} /> */}
      </div>
    </div>
  );
}