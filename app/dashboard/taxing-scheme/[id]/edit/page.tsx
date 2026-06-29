import { TaxingSchemeForm } from '@/components/taxing-scheme/taxing-scheme-form';
import { Metadata } from 'next';
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

interface EditProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Edit Taxing Scheme ${id} | Dashboard` };
}

export default async function EditTaxingSchemePage({ params }: EditProps) {
  const { id } = await params;
  const taxingScheme = await getTaxingScheme(id);

  if (!taxingScheme) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Edit Taxing Scheme
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Modify rules, rates, or exemptions for this scheme.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <TaxingSchemeForm initialData={taxingScheme} />
      </div>
    </div>
  );
}