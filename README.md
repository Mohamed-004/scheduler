# Dynamic Crew Scheduler

An intelligent workforce management platform that automates the entire lifecycle of field jobs, from sales booking to crew completion, with real-time scheduling, SMS communication, and AI-powered client support.

## Phase 1: Foundation & Infrastructure (COMPLETED)

✅ **Core Architecture**
- Next.js 14 with App Router
- TypeScript throughout
- Tailwind CSS for styling
- Modern @supabase/ssr for authentication and database

✅ **UI Framework**
- shadcn/ui components built on Radix UI
- Responsive design patterns
- Form handling with react-hook-form + Zod validation

✅ **Database Schema**
- PostgreSQL with proper relationships
- Row-Level Security (RLS) policies
- Real-time subscriptions enabled
- Timezone-aware timestamp storage (UTC)

✅ **Authentication System**
- Supabase Auth with email/SMS OTP
- Role-based access control (admin, sales, worker, client)
- Secure middleware implementation

✅ **Development Infrastructure**
- TanStack Query for server state management
- Timezone utilities with dayjs
- TypeScript interfaces for all domain models
- Build system configured and tested

## Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui, Radix UI
- **Database**: Supabase PostgreSQL with RLS
- **Authentication**: Supabase Auth
- **State Management**: TanStack React Query
- **Forms**: react-hook-form + Zod validation
- **Date/Time**: dayjs with timezone support

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account

### 1. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database Setup

1. Create a new Supabase project
2. In the SQL Editor, run the migration file: `supabase/migrations/001_initial_schema.sql`
3. This will create all tables, RLS policies, and enable real-time subscriptions

### 3. Installation & Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### 4. Authentication Configuration

In your Supabase dashboard:

1. Go to **Authentication > Settings**
2. Enable **Email** and **SMS** providers
3. Configure your email templates
4. Set up your SMS provider (Twilio integration coming in later phases)

## Project Structure

```
scheduler/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (auth)/         # Authentication route group
│   │   └── dashboard/      # Main dashboard
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   └── providers/     # Context providers
│   ├── lib/
│   │   ├── supabase/      # Database clients
│   │   └── timezone.ts    # Timezone utilities
│   └── types/             # TypeScript definitions
├── supabase/
│   └── migrations/        # Database migrations
└── public/                # Static assets
```

## Database Schema

### Core Tables

- **users** - Extends auth.users with role and timezone
- **clients** - Customer information and contact details
- **workers** - Crew member profiles with ratings
- **crews** - Team groupings with worker relationships
- **jobs** - Work orders with scheduling and status
- **timeline_items** - Detailed work execution records

### User Roles

- **admin** - Full system access, crew management, oversight
- **sales** - Job creation, client management, calendar access
- **worker** - Mobile interface, job execution, time tracking
- **client** - Read-only access via magic links (future phases)

## Key Features (Phase 1)

### ✅ Implemented
- Modern Next.js 14 foundation with App Router
- Supabase integration with proper SSR setup
- Complete database schema with relationships
- Role-based authentication and authorization
- Responsive UI framework with shadcn/ui
- Timezone-aware date handling
- Real-time database subscriptions
- Type-safe development environment

### 🚧 Next Phases
- Job creation and management APIs
- Intelligent crew assignment algorithm
- Real-time calendar and timeline views
- SMS integration with Twilio
- AI-powered client Q&A system
- Mobile worker interface
- Dynamic re-balancing system

## Security Features

- Row-Level Security (RLS) on all tables
- JWT-based role authentication
- Secure cookie handling with @supabase/ssr
- Input validation with Zod schemas
- Protected API routes with middleware

## Development Notes

- All timestamps stored in UTC, converted to user timezone on display
- Follows Next.js 14 best practices with App Router
- Uses modern React patterns (Server Components where possible)
- Comprehensive TypeScript coverage
- Built for scalability and maintainability

## MCP (Model Context Protocol) Setup

To enable AI tools like Cursor to read your database and help with debugging:

### Quick Setup
```bash
npm run setup-mcp
```

### Manual Setup
1. Create a personal access token in [Supabase Settings](https://supabase.com/dashboard/account/tokens)
2. Copy `.cursor/mcp.json.template` to `.cursor/mcp.json`
3. Replace placeholders with your project reference and access token
4. Restart Cursor

See `MCP_SETUP.md` for detailed instructions and troubleshooting.

### What MCP Enables
- Database schema analysis
- SQL query execution (read-only)
- TypeScript type generation
- Debugging assistance
- Data analysis and reporting

## Contributing

This is Phase 1 of a multi-phase implementation. Each phase builds incrementally on the previous foundation. See the project roadmap for upcoming features and phases.

## License

Private project - All rights reserved.
