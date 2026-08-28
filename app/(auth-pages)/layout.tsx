import { GalleryVerticalEndIcon } from "lucide-react";
import Link from "next/link";

export default async function AuthPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div>
      { children }
    </div>
  );
}