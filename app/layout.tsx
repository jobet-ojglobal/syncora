import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/theme.provider";
import { getCurrentUserBasic } from "@/lib/user";
import { UserProvider } from "@/context/UserProvider";

// Headings Font mapping to CSS variable --font-heading
const jetbrainsMonoHeading = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-heading",
});

// Primary Body Font mapping to CSS variable --font-sans
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Syncora",
    template: "%s | Syncora",
  },
  description:
    "Syncora is a modern retail management platform that combines eCommerce, POS, inventory management, branch operations, customer orders, analytics, reporting, and warehouse management into one powerful system.",
  keywords: [
    "Retail ERP",
    "Point of Sale",
    "POS System",
    "Inventory Management",
    "Warehouse Management",
    "Branch Management",
    "Order Management",
    "Product Management",
    "Retail Analytics",
    "Ecommerce",
    "Next.js",
    "Prisma",
    "PostgreSQL",
  ],
  applicationName: "Syncora",
  authors: [
    {
      name: "Syncora",
    },
  ],
  creator: "Syncora",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Syncora",
    title: "Syncora",
    description:
      "Manage products, inventory, branches, orders, customers, analytics, and POS from a single modern retail platform.",
    images: [
      {
        url: "/og-storefront.png",
        width: 1200,
        height: 630,
        alt: "Syncora",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Syncora",
    description:
      "Modern retail ERP, POS, inventory, and eCommerce platform.",
    images: ["/og-storefront.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const user = await getCurrentUserBasic();

  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        inter.variable,
        jetbrainsMonoHeading.variable
      )}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {/* <UserProvider initialUser={user}> */}
              {children}
            {/* </UserProvider> */}
          </TooltipProvider>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}