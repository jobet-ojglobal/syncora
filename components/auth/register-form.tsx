"use client";

import React, { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import useSWR from "swr";
import { toast } from "sonner";
import { Loader2, UserPlus, ShieldAlert, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

// Enum definition matching your Prisma Schema
export const UserRoleEnum = z.enum(["Admin", "TeamMember", "Customer"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

// Form Schema with validation rules
export const registerUserSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username cannot exceed 30 characters")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Username can only contain letters, numbers, underscores, and hyphens"
      ),
    name: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email address format"),
    role: UserRoleEnum,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string(),
    teamMemberId: z.string().optional().nullable(),
    inflowCustomerId: z.string().optional().nullable(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterUserFormValues = z.infer<typeof registerUserSchema>;

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed loading system entities.");
    return res.json();
  });

interface OptionItem {
  id: string;
  name: string;
}

export function RegisterUserForm({
  className,
  onSuccess,
  ...props
}: React.ComponentProps<"div"> & { onSuccess?: () => void }) {
  // Option lists for relational fields
  const { data: teamMembersData } = useSWR<OptionItem[]>(
    "/api/admin/team-members/options",
    fetcher
  );
  const { data: customersData } = useSWR<OptionItem[]>(
    "/api/admin/customers/options",
    fetcher
  );

  const form = useForm<RegisterUserFormValues>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      role: "Customer",
      password: "",
      confirmPassword: "",
      teamMemberId: null,
      inflowCustomerId: null,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const selectedRole = useWatch({ control, name: "role" });

  useEffect(() => {
    if (selectedRole !== "TeamMember") setValue("teamMemberId", null);
    if (selectedRole !== "Customer") setValue("inflowCustomerId", null);
  }, [selectedRole, setValue]);

  const onSubmit = async (values: RegisterUserFormValues) => {
    try {
      // 1. Better-Auth SignUp API invocation
      const { data, error } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
        username: values.username,
      });

      if (error) {
        throw new Error(error.message || "Failed user auth provisioning.");
      }

      // 2. Patch administrative fields (role & domain mappings) via backend endpoint
      if (data?.user?.id) {
        const patchRes = await fetch(`/api/admin/users/${data.user.id}/meta`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: values.role,
            teamMemberId: values.teamMemberId || null,
            inflowCustomerId: values.inflowCustomerId || null,
          }),
        });

        if (!patchRes.ok) {
          const errData = await patchRes.json();
          throw new Error(errData.error || "Failed linking administrative parameters.");
        }
      }

      toast.success("User Provisioned Successfully", {
        description: `Registered user account for ${values.name} (${values.email}).`,
      });

      reset();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Registration Exception", {
        description: err.message || "An error occurred while creating the account.",
      });
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Provision Admin User
          </CardTitle>
          <CardDescription>
            Register a new system user account, configure security permissions, and bind domain identity maps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup>
              {/* Username Field */}
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe_admin"
                  {...register("username")}
                  disabled={isSubmitting}
                />
                {errors.username && (
                  <span className="text-[11px] font-medium text-destructive mt-1">
                    {errors.username.message}
                  </span>
                )}
              </Field>

              {/* Full Name Field */}
              <Field>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  {...register("name")}
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <span className="text-[11px] font-medium text-destructive mt-1">
                    {errors.name.message}
                  </span>
                )}
              </Field>

              {/* Email Address Field */}
              <Field>
                <FieldLabel htmlFor="email">Email Address</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="johndoe@company.com"
                  {...register("email")}
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <span className="text-[11px] font-medium text-destructive mt-1">
                    {errors.email.message}
                  </span>
                )}
              </Field>

              {/* System Role Selection */}
              <Field>
                <FieldLabel htmlFor="role">Access Role</FieldLabel>
                <select
                  id="role"
                  {...register("role")}
                  disabled={isSubmitting}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="Customer">Customer</option>
                  <option value="TeamMember">Team Member</option>
                  <option value="Admin">Administrator</option>
                </select>
                {errors.role && (
                  <span className="text-[11px] font-medium text-destructive mt-1">
                    {errors.role.message}
                  </span>
                )}
              </Field>

              {/* Dynamic Relationship Mapping: Team Member Binding */}
              {selectedRole === "TeamMember" && (
                <Field className="animate-in fade-in-50 duration-200">
                  <FieldLabel htmlFor="teamMemberId">Link Team Member Entity</FieldLabel>
                  <select
                    id="teamMemberId"
                    {...register("teamMemberId")}
                    disabled={isSubmitting}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <option value="">-- Unassigned --</option>
                    {teamMembersData?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <FieldDescription>
                    Connects user login state with an internal staff member profile.
                  </FieldDescription>
                </Field>
              )}

              {/* Dynamic Relationship Mapping: Customer Binding */}
              {selectedRole === "Customer" && (
                <Field className="animate-in fade-in-50 duration-200">
                  <FieldLabel htmlFor="inflowCustomerId">Link Customer Entity</FieldLabel>
                  <select
                    id="inflowCustomerId"
                    {...register("inflowCustomerId")}
                    disabled={isSubmitting}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <option value="">-- Unassigned --</option>
                    {customersData?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <FieldDescription>
                    Associates client portal access with an active Customer account.
                  </FieldDescription>
                </Field>
              )}

              {/* Password Grid Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                    disabled={isSubmitting}
                  />
                  {errors.password && (
                    <span className="text-[11px] font-medium text-destructive mt-1">
                      {errors.password.message}
                    </span>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...register("confirmPassword")}
                    disabled={isSubmitting}
                  />
                  {errors.confirmPassword && (
                    <span className="text-[11px] font-medium text-destructive mt-1">
                      {errors.confirmPassword.message}
                    </span>
                  )}
                </Field>
              </div>

              {/* Action Submit Button */}
              <Field className="pt-2">
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Provisioning Account...
                    </>
                  ) : (
                    "Create User Account"
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}