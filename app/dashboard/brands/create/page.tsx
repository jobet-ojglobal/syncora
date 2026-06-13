"use client";

import { useState } from "react";
import Link from "next/link";

import {
  ArrowLeft,
  Package,
  Save,
} from "lucide-react";

import { useRouter } from "next/navigation";

export default function CreateBrandPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    logoUrl: "",
    websiteUrl: "",
  });

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await fetch(
        `/api/admin/brands`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to create brand"
        );
      }

      router.push(
        "/admin/brands"
      );
    } catch (error) {
      console.error(error);
      alert(
        "Failed to create brand"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* HEADER */}
        <div className="mb-10">
          <Link
            href="/admin/brands"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Brands
          </Link>

          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-indigo-100 p-5">
              <Package className="h-8 w-8 text-indigo-600" />
            </div>

            <div>
              <h1 className="text-4xl font-black text-slate-900">
                Create Brand
              </h1>

              <p className="mt-2 text-slate-600">
                Add a new manufacturer
                or product brand.
              </p>
            </div>
          </div>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8"
        >
          <Field
            label="Brand Name"
            value={form.name}
            onChange={(value) =>
              setForm({
                ...form,
                name: value,
              })
            }
          />

          <TextareaField
            label="Description"
            value={form.description}
            onChange={(value) =>
              setForm({
                ...form,
                description:
                  value,
              })
            }
          />

          <Field
            label="Logo URL"
            value={form.logoUrl}
            onChange={(value) =>
              setForm({
                ...form,
                logoUrl: value,
              })
            }
          />

          <Field
            label="Website URL"
            value={form.websiteUrl}
            onChange={(value) =>
              setForm({
                ...form,
                websiteUrl:
                  value,
              })
            }
          />

          <div className="flex justify-end gap-4">
            <Link
              href="/admin/brands"
              className="rounded-2xl border border-slate-300 px-6 py-4 font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Link>

            <button
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />

              {loading
                ? "Saving..."
                : "Create Brand"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: any) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none focus:border-indigo-500"
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
}: any) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <textarea
        rows={5}
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none focus:border-indigo-500"
      />
    </div>
  );
}