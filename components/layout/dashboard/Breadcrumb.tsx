"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import {
  Breadcrumb as ShadcnBreadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { Button } from "@/components/ui/button";

import { breadcrumbsMap } from "@/lib/constData";
import { useIsMobile } from "@/hooks/use-mobile";

const ITEMS_TO_DISPLAY = 3;
const MIN_ITEMS = 3;

interface BreadcrumbNode {
  id: string;
  href: string;
  label: string;
  children?: BreadcrumbNode[];
}

interface TrailItem extends BreadcrumbNode {
  isActive?: boolean;
}

interface Props {
  limit?: boolean;
  backData?: {
    label: string;
    href: string;
  };
  dynamicLabels?: Record<string, string>;
}

/* -------------------------------------------------------------------------- */
/*                                   UTILS                                    */
/* -------------------------------------------------------------------------- */

const replaceDynamicParams = (
  path: string,
  params: Record<string, string | undefined>
) => {
  return path.replace(/\[([^\]]+)\]/g, (_, key) => params[key] ?? `[${key}]`);
};

const pathToRegex = (path: string) => {
  const regex = path
    .replace(/\//g, "\\/")
    .replace(/\[([^\]]+)\]/g, "[^/]+");

  return new RegExp(`^${regex}$`);
};

const resolveLabel = (
  label: string,
  dynamicLabels?: Record<string, string>
) => {
  return label.replace(/\{([^}]+)\}/g, (_, key) => {
    return dynamicLabels?.[key] ?? key;
  });
};

const findBreadcrumbDynamicTrail = (
  map: BreadcrumbNode[],
  pathname: string,
  trail: TrailItem[] = [],
  params: Record<string, string | undefined> = {},
  dynamicLabels?: Record<string, string>
): TrailItem[] | null => {
  for (const item of map) {
    const resolvedHref = replaceDynamicParams(item.href, params);

    const newTrail = [
      ...trail,
      {
        ...item,
        href: resolvedHref,
        label: resolveLabel(item.label, dynamicLabels),
      },
    ];

    const isDynamic = item.href.includes("[");
    const regex = pathToRegex(item.href);

    const matches = isDynamic
      ? regex.test(pathname)
      : resolvedHref === pathname;

    if (matches) {
      return newTrail.map((t, i, arr) => ({
        ...t,
        isActive: i === arr.length - 1,
      }));
    }

    if (item.children) {
      const result = findBreadcrumbDynamicTrail(
        item.children,
        pathname,
        newTrail,
        params,
        dynamicLabels
      );

      if (result) return result;
    }
  }

  return null;
};

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

const Breadcrumb = ({
  limit,
  backData,
  dynamicLabels,
}: Props) => {
  const pathname = usePathname();
  const params = useParams();
  const isMobile = useIsMobile();

  const [open, setOpen] = React.useState(false);

  const trail =
    findBreadcrumbDynamicTrail(
      breadcrumbsMap,
      pathname,
      [],
      {
        slug: params?.slug as string | undefined,
        id: params?.id as string | undefined,
      },
      dynamicLabels
    ) ?? [];

  if (limit && trail.length <= 1) {
    return null;
  }

  const collapsedItems =
    trail.length > ITEMS_TO_DISPLAY
      ? trail.slice(1, -2)
      : [];

  const visibleItems =
    trail.length > ITEMS_TO_DISPLAY
      ? [
          trail[trail.length - 2],
          trail[trail.length - 1],
        ]
      : trail;

  return (
    <ShadcnBreadcrumb>
      <BreadcrumbList>

        {/* BACK BUTTON */}
        {backData && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={backData.href}>
                  {backData.label}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />
          </>
        )}

        {/* FIRST ITEM */}
        {trail.length > MIN_ITEMS && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={trail[0]?.href ?? "#"}>
                  {trail[0]?.label}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />
          </>
        )}

        {/* COLLAPSED ITEMS */}
        {collapsedItems.length > 0 && (
          <>
            <BreadcrumbItem>
              {!isMobile ? (
                <DropdownMenu
                  open={open}
                  onOpenChange={setOpen}
                >
                  <DropdownMenuTrigger
                    className="flex items-center"
                    aria-label="Toggle breadcrumb menu"
                  >
                    <BreadcrumbEllipsis className="h-4 w-4" />
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="start">
                    {collapsedItems.map((item) => (
                      <DropdownMenuItem key={item.id} asChild>
                        <Link href={item.href}>
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Drawer
                  open={open}
                  onOpenChange={setOpen}
                >
                  <DrawerTrigger aria-label="Toggle breadcrumb menu">
                    <BreadcrumbEllipsis className="h-4 w-4" />
                  </DrawerTrigger>

                  <DrawerContent>
                    <DrawerHeader className="text-left">
                      <DrawerTitle>
                        Navigate to
                      </DrawerTitle>

                      <DrawerDescription>
                        Select a page.
                      </DrawerDescription>
                    </DrawerHeader>

                    <div className="grid gap-2 px-4">
                      {collapsedItems.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="text-sm py-1"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    <DrawerFooter>
                      <DrawerClose asChild>
                        <Button variant="outline">
                          Close
                        </Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              )}
            </BreadcrumbItem>

            <BreadcrumbSeparator />
          </>
        )}

        {/* LAST ITEMS */}
        {visibleItems.map((item, index) => (
          <React.Fragment key={item.id}>
            <BreadcrumbItem>
              {item.isActive ? (
                <BreadcrumbPage className="max-w-[200px] truncate">
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>

            {index < visibleItems.length - 1 && (
              <BreadcrumbSeparator />
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </ShadcnBreadcrumb>
  );
};

export default Breadcrumb;