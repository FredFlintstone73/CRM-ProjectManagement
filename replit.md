# ClientHub - CRM and Project Management Platform

## Overview

ClientHub is a comprehensive CRM (Customer Relationship Management) and project management platform built as a full-stack web application. It provides businesses with tools to manage contacts, projects, tasks, and track interactions with clients and prospects. The system is designed to unify contact management across different relationship types (clients, prospects, team members, strategic partners) while providing comprehensive project tracking and task management capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite for fast development and optimized builds
- **Form Management**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **API Pattern**: RESTful APIs with JSON responses

### Build and Development
- **Development**: tsx for TypeScript execution
- **Production Build**: esbuild for server bundling, Vite for client bundling
- **Database Migrations**: Drizzle Kit for schema management
- **Development Tools**: Replit-specific tooling for enhanced development experience

## Key Components

### Database Schema
The application uses a comprehensive schema with the following main entities:

1. **Users**: Authentication and profile management (required for Replit Auth)
2. **Contacts**: Unified contact management with types (client, prospect, team_member, strategic_partner)
3. **Projects**: Project lifecycle management with client associations
4. **Tasks**: Task management with project assignments and priority levels
5. **Project Templates**: Reusable project structures
6. **Communication Tracking**: Email interactions and call transcripts
7. **Activity Logging**: Comprehensive audit trail for all system actions
8. **Sessions**: Session storage for authentication persistence

### Frontend Components
- **Layout Components**: Sidebar navigation, header with quick actions
- **Dashboard**: Stats cards, recent activity, project status, upcoming tasks
- **Contact Management**: Contact forms, search/filter, type-based categorization
- **Project Management**: Project forms, progress tracking, client associations
- **Task Management**: Task forms, priority/status management, project assignments
- **UI Components**: Comprehensive component library based on Radix UI primitives

### API Endpoints
- **Authentication**: `/api/auth/*` - User authentication and session management
- **Dashboard**: `/api/dashboard/*` - Statistics and activity feeds
- **Contacts**: `/api/contacts/*` - CRUD operations for contacts
- **Projects**: `/api/projects/*` - CRUD operations for projects
- **Tasks**: `/api/tasks/*` - CRUD operations for tasks
- **Templates**: `/api/templates/*` - Project template management
- **Communications**: `/api/communications/*` - Email and call tracking

## Data Flow

### Authentication Flow
1. User accesses protected routes
2. Replit Auth middleware validates session
3. User information stored in PostgreSQL sessions table
4. Frontend receives user data through `/api/auth/user` endpoint
5. React Query manages authentication state globally

### Data Management Flow
1. Frontend components use React Query for server state
2. API requests include credentials for session validation
3. Express routes validate authentication before processing
4. Drizzle ORM handles database operations with type safety
5. Activity logging automatically tracks all data changes
6. Real-time updates through query invalidation

### Form Handling
1. React Hook Form manages form state and validation
2. Zod schemas provide runtime validation
3. Form submissions trigger API calls through React Query mutations
4. Success/error states managed through toast notifications
5. Query cache automatically updated on successful operations

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **react-hook-form**: Form management
- **zod**: Schema validation
- **tailwindcss**: Utility-first CSS framework

### Authentication
- **openid-client**: OpenID Connect implementation
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler
- **vite**: Frontend build tool
- **drizzle-kit**: Database schema management
- **@replit/vite-plugin-***: Replit-specific development enhancements

## Deployment Strategy

### Development Environment
- **Server**: Express server with Vite middleware for HMR
- **Database**: Neon Database with connection pooling
- **Authentication**: Replit Auth with development-specific configuration
- **File Serving**: Vite dev server for frontend assets
- **Live Reload**: Replit-specific runtime error modal and cartographer

### Production Environment
- **Build Process**: 
  - Frontend: Vite builds React app to `dist/public`
  - Backend: esbuild bundles server code to `dist/index.js`
- **Database**: Production Neon Database with connection pooling
- **Authentication**: Production Replit Auth configuration
- **Static Assets**: Express serves built frontend from `dist/public`
- **Process Management**: Node.js process running bundled server code

### Database Management
- **Schema**: Centralized in `shared/schema.ts` for type sharing
- **Migrations**: Automated through Drizzle Kit
- **Connection**: Pooled connections via Neon's serverless driver
- **Environment**: DATABASE_URL environment variable for connection string

The architecture prioritizes type safety, developer experience, and scalability while maintaining simplicity in deployment and maintenance. The shared schema approach ensures consistency between frontend and backend, while the modular component structure supports easy feature extension and maintenance.

## Recent Changes (July 2025)

### Comprehensive Client Data Collection System
- **Database Schema Expansion**: Extended contacts table with 70+ new fields for comprehensive client data
- **Tabbed Contact Form**: Created 6-section contact form (Basic, Contact, Spouse, Address, Children, Professionals)
- **Client Information Collection**: Family name, personal details, SSN, government ID, date of birth/death
- **Contact Details**: Separate cell/work phones, personal/work emails, preferred contact methods
- **Spouse Information**: Complete spouse data including personal details, contact information, marriage date
- **Address Management**: Separate mailing and home addresses with complete address fields
- **Children Tracking**: Support for up to 7 children with names, gender, and birth dates
- **Professional Contacts**: Integration with investment advisors, tax professionals, attorneys, insurance agents
- **Data Validation**: Proper date handling, required field validation, and form state management
- **User Experience**: Professional tabbed interface with cards, descriptions, and responsive design

### Contact Detail Page Layout Improvements (July 12, 2025)
- **Fixed Edit Client Functionality**: Resolved server-side date processing issues in updateContact method
- **Layout Restructuring**: Moved Marriage Information card to correct position between contact cards and address section
- **Contact Card Enhancements**: Added Date of Death fields to both Contact 1 and Contact 2 cards
- **ID Information Section**: Added comprehensive ID Type, ID Number, and ID Expiration fields to main contact cards
- **Left Sidebar Optimization**: Simplified sidebar to show essential quick-access info (Cell Phone, Email, Preferred Contact)
- **Contact Information Priority**: Moved contact information sections above ID information for better user flow
- **Text Messaging Support**: Added "Text" as preferred contact method option in forms and display
- **Professional Contacts Display**: Comprehensive professional contacts section showing Investment Advisor, Tax Professional, Attorney, and Insurance Agent information

### Project Due Date Tracking Feature
- **Added comprehensive project due date tracking widget** with flexible time period selection
- **Database Enhancement**: Enhanced project storage with due date filtering methods
- **API Endpoints**: Added `/api/dashboard/projects-due` endpoint with date range filtering
- **Frontend Component**: Created `ProjectsDueWidget` with time period dropdown selector
- **Time Period Options**: Next 1 week, 2 weeks, 1 month, 4 months (default), 12 months
- **Visual Indicators**: Color-coded urgency indicators, progress tracking, and status badges
- **User Experience**: Real-time project count display, responsive design, and smooth transitions

### Professional CRM Design Implementation
- **Design System**: Applied professional CRM color scheme with blues, grays, and clean whites
- **Sidebar Enhancement**: Dark theme sidebar with expanded navigation menu
- **Dashboard Metrics**: Modern metric cards with trend indicators and percentage changes
- **Component Library**: Comprehensive CSS component system with status badges and priority indicators
- **Responsive Layout**: Mobile-first design with proper grid systems and spacing

### Task Management Enhancement (July 12, 2025)
- **Removed "Created Date" Sort Option**: Simplified task sorting to only include Assignee and Due Date options
- **Row View Implementation**: Changed task display from card view to compact row view with scrollable container
- **Improved Task Assignment Logic**: Fixed "Assign to me" functionality to correctly identify current user
- **Database Validation**: Added server-side validation to ensure only team members can be assigned to tasks
- **Task Display Optimization**: Compact row design with fixed height scrollable container (max-height: 96px)
- **Assignment Cleanup**: Removed incorrect client assignments from existing tasks

### Dynamic Progress Bar Implementation (July 12, 2025)
- **Real-time Progress Calculation**: Progress bars now calculate completion based on actual task status
- **Project Detail Page**: Progress updates automatically when tasks are marked as completed
- **Projects Page**: Both card and table views show dynamic progress based on task completion
- **Dashboard Integration**: Project status widget displays real-time progress calculations
- **Consistent Progress Logic**: Unified progress calculation across all project views (completed tasks / total tasks * 100)
- **Performance Optimization**: Efficient task data fetching for progress calculations

### Project Deletion Enhancement (July 12, 2025)
- **Cascading Deletion**: Improved deleteProject method to handle foreign key constraints properly
- **Related Records Cleanup**: Automatically deletes associated tasks and comments when project is deleted
- **Better Error Handling**: Enhanced error messages and logging for deletion failures
- **Frontend Improvements**: Better error feedback and cache invalidation after deletion
- **Database Integrity**: Ensures clean deletion without orphaned records