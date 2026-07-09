![Alt text](./public/og-storefront.png)

# Syncora

A Next.js 16 full-stack application for inventory and data synchronization management. Built with TypeScript, Prisma, PostgreSQL, Redis, and BullMQ for job queue processing.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui, Radix UI
- **Forms**: React Hook Form, Zod validation
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL with Prisma Adapter
- **Caching & Queues**: Redis + BullMQ
- **Data Fetching**: SWR
- **Icons**: Lucide React
- **Notifications**: Sonner (toast)
- **Workers**: TSX watch for background job processing

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (workspace manager)
- PostgreSQL
- Redis

### Installation

```bash
pnpm install
```

### Environment Setup

Create a `.env` file at the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/syncora
REDIS_URL=redis://localhost:6379
```

### Development

```bash
# Start development server
pnpm dev

# Start background worker
pnpm worker

# Run linter
pnpm lint

# Build for production
pnpm build

# Start production server
pnpm start
```

### Docker

```bash
# Build and run with Docker Compose
docker compose up

# Development with hot reload
docker compose -f docker-compose.yml up
```

## Project Structure

```
syncora-2/
├── app/                    # Next.js App Router
│   ├── _components/        # Shared layout components
│   ├── api/                # API routes
│   │   ├── admin/          # Admin endpoints
│   │   ├── attributes/     # Product attributes management
│   │   ├── brands/         # Brand CRUD operations
│   │   ├── categories/     # Category management
│   │   ├── groups/         # Group operations
│   │   ├── inflow/         # Inflow integration endpoints
│   │   ├── local/          # Local operations
│   │   ├── locations/      # Location CRUD
│   │   ├── products/       # Product management
│   │   ├── settings/       # System settings
│   │   ├── sub-locations/  # Sub-location endpoints
│   │   ├── sync/           # Synchronization service
│   │   └── webhooks/       # Webhook handlers
│   ├── dashboard/          # Protected dashboard routes
│   │   ├── attributes/     # Attributes management page
│   │   ├── brands/         # Brands list & CRUD
│   │   ├── categories/     # Categories management
│   │   ├── currencies/     # Currency configuration
│   │   ├── customers/      # Customer management
│   │   ├── etl/            # Extract-Transform-Load pages
│   │   ├── groups/         # Groups management
│   │   ├── inflow-cloud/   # Inflow Cloud integration
│   │   ├── inventory/      # Inventory dashboard
│   │   ├── locations/      # Location management
│   │   ├── payment-terms/  # Payment terms config
│   │   ├── pricing-scheme/ # Pricing scheme setup
│   │   ├── products/       # Product catalog
│   │   ├── settings/       # App settings
│   │   ├── tags/           # Tag management
│   │   ├── taxing-scheme/  # Tax scheme config
│   │   ├── team-members/   # Team member management
│   │   ├── transfers/      # Inventory transfers
│   │   ├── uoms/           # Units of measure
│   │   ├── vendors/        # Vendor management
│   │   ├── layout.tsx      # Dashboard layout wrapper
│   │   └── page.tsx        # Dashboard index page
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing/home page
├── components/             # Reusable React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities & helpers
│   └── workers/            # BullMQ job queue workers
├── services/               # Business logic layer
├── actions/                # Server actions (Next.js 13+)
├── helpers/                # Helper functions
├── schemas/                # Zod validation schemas
├── types/                  # TypeScript type definitions
├── prisma/                 # Prisma schema & migrations
├── providers/              # Context providers
├── public/                 # Static assets
├── generated/              # Auto-generated files (Prisma types)
├── next.config.ts          # Next.js configuration
├── tsconfig.json           # TypeScript config
├── tailwind.config.js      # Tailwind CSS config
├── docker-compose.yml      # Docker Compose setup
├── Dockerfile              # Container image definition
└── package.json            # Dependencies & scripts
```

## Route Architecture

### Public Routes
- `/` - Landing/home page

### API Routes (RESTful)

#### Admin
- `POST /api/admin/...` - Admin operations

#### Attributes
- `GET /api/attributes` - List all attributes
- `POST /api/attributes` - Create attribute
- `PATCH /api/attributes/:id` - Update attribute
- `DELETE /api/attributes/:id` - Delete attribute

#### Brands
- `GET /api/brands` - List all brands
- `POST /api/brands` - Create brand
- `PATCH /api/brands/:id` - Update brand
- `DELETE /api/brands/:id` - Delete brand

#### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category
- `PATCH /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

#### Groups
- `GET /api/groups` - List all groups
- `POST /api/groups` - Create group
- `PATCH /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

#### Locations & Sub-Locations
- `GET /api/locations` - List all locations
- `POST /api/locations` - Create location
- `PATCH /api/locations/:id` - Update location
- `DELETE /api/locations/:id` - Delete location
- `GET /api/sub-locations` - List sub-locations
- `POST /api/sub-locations` - Create sub-location

#### Products
- `GET /api/products` - List all products (paginated)
- `POST /api/products` - Create product
- `PATCH /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/:id` - Get product details

#### Inflow Integration
- `POST /api/inflow/...` - Inflow sync operations
- `GET /api/inflow/...` - Fetch from Inflow

#### Sync Service
- `POST /api/sync` - Trigger manual sync
- `GET /api/sync/status` - Check sync status

#### Webhooks
- `POST /api/webhooks/...` - External webhook handlers

#### Settings
- `GET /api/settings` - Fetch system settings
- `PATCH /api/settings` - Update system settings

#### Local Operations
- `GET /api/local/...` - Local-only operations

### Protected Routes (Dashboard)

**Base Path**: `/dashboard`

#### Dashboard Home
- `/dashboard` - Dashboard index page

#### Master Data Management
- `/dashboard/attributes` - Manage product attributes
- `/dashboard/brands` - Manage brands
- `/dashboard/categories` - Manage categories
- `/dashboard/groups` - Manage product groups
- `/dashboard/tags` - Manage tags
- `/dashboard/vendors` - Manage vendors
- `/dashboard/customers` - Manage customers

#### Inventory Management
- `/dashboard/inventory` - Inventory overview
- `/dashboard/locations` - Location management
- `/dashboard/transfers` - Inventory transfer records
- `/dashboard/uoms` - Units of measure configuration

#### Pricing & Configuration
- `/dashboard/pricing-scheme` - Pricing scheme setup
- `/dashboard/taxing-scheme` - Tax scheme configuration
- `/dashboard/payment-terms` - Payment terms setup
- `/dashboard/currencies` - Currency configuration

#### Integrations
- `/dashboard/inflow-cloud` - Inflow Cloud connector setup
- `/dashboard/etl` - ETL (Extract-Transform-Load) data pipeline

#### Settings & Team
- `/dashboard/settings` - Application settings
- `/dashboard/team-members` - Team member management

## Database Schema

Managed via Prisma ORM located in `/prisma/schema.prisma`. Key entities include:

- Products, Categories, Attributes, Brands
- Locations, SubLocations (warehouse locations)
- Inventory (stock levels)
- Customers, Vendors
- Pricing & Taxing Schemes
- Currency, Payment Terms, UOM
- User, TeamMember (authentication & access control)

Run migrations:

```bash
npx prisma migrate dev --name <migration_name>
```

## Background Jobs & Workers

Job queue powered by **BullMQ** + **Redis**.

Worker entry point: `/lib/workers/index.ts`

Run worker process:

```bash
pnpm worker
```

Common jobs:
- Product sync (Inflow → Local DB)
- Inventory reconciliation
- Report generation
- Webhook processing

## API Response Format

All API endpoints follow a consistent response structure:

```json
{
  "success": true,
  "data": { },
  "message": "Operation successful"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": {}
}
```

## Form Validation

All forms use **React Hook Form** + **Zod** for validation. Schemas located in `/schemas/`.

Example:

```typescript
// schemas/product.ts
import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Name required"),
  sku: z.string().min(1, "SKU required"),
  price: z.number().min(0),
});

export type ProductForm = z.infer<typeof productSchema>;
```

## State Management & Data Fetching

- **SWR**: Client-side data fetching with caching
- **React Context**: Global state via `/providers/`
- **Server Actions**: Server-side mutations (Next.js 13+)

## Styling

Tailwind CSS 4 with shadcn/ui components. Custom theme in `tailwind.config.js`.

Light/dark mode via `next-themes`.

## Development Tips

1. **Add a new dashboard page**: Create folder under `/app/dashboard/<feature>/`, add `page.tsx` and optional `layout.tsx`.
2. **Add a new API endpoint**: Create route handler in `/app/api/<resource>/route.ts` (supports GET, POST, PATCH, DELETE).
3. **Add a Prisma model**: Update `/prisma/schema.prisma`, then run `npx prisma migrate dev`.
4. **Create reusable component**: Add to `/components/` with `.tsx` extension.
5. **Add validation schema**: Create in `/schemas/` and use with React Hook Form.

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_SECRET` - Authentication secret (if using NextAuth)
- `NEXTAUTH_URL` - Authentication URL (if using NextAuth)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma ORM](https://www.prisma.io/docs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Hook Form](https://react-hook-form.com/)
- [BullMQ Documentation](https://docs.bullmq.io/)

## License

Private project.
