"use client"

import Image from "next/image"
import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"
import AppLogo from "@/components/shared/app-logo"

export default function SignupPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="#" className="flex items-center gap-2 font-medium ">
              <AppLogo />
            JG Superstore
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignupForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/assets/image-bg-1.png"
          alt="Authentication layout background"
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover dark:brightness-[0.2] dark:grayscale"
          priority
        />
      </div>
    </div>
  )
}