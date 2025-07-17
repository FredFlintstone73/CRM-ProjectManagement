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

### Dashboard Dropdown Update (July 12, 2025)
- **Removed 6 Months Option**: Removed "Next 6 Months" from dashboard dropdown as requested
- **Added Custom Date Range**: Added "Custom Date Range" option to dashboard dropdown
- **Error Handling**: Fixed undefined range error in ProjectsDueWidget component
- **Timeline Chart Update**: Updated ProjectsTimelineChart to handle new dropdown options
- **Default Handling**: Improved fallback handling for undefined period selections

### Custom Date Range Implementation (July 12, 2025)
- **Date Picker Interface**: Added popover with start and end date inputs for custom range selection
- **Timeline Chart Integration**: Custom dates now properly affect the timeline chart display
- **Projects Due Widget**: Updated to use custom dates when custom range is selected
- **State Management**: Added dashboard state management for custom start and end dates
- **Query Optimization**: Updated query keys to include custom dates for proper cache invalidation
- **User Experience**: Clean popover interface with "Set Dates" button and "Apply Date Range" functionality

### Department Selection Feature (July 13, 2025)
- **Database Schema**: Added departments array field to contacts table supporting Accounting, Planning, and Tax departments
- **Contact Forms**: Added department selection with checkboxes for all contact types (clients, prospects, strategic partners, team members)
- **Multiple Selection**: Users can select multiple departments for each contact using checkbox interface
- **Contact Details Display**: Departments shown as badges below contact type and status in contact detail pages
- **Sidebar Integration**: Department badges displayed in left sidebar for strategic partners and team members
- **Form Integration**: Department selection integrated into both simplified and full contact forms
- **Status Display Update**: Removed status dropdown, now showing status as badge next to contact type for cleaner interface

### Advanced Contact Notes System (July 13, 2025)
- **Database Schema**: Created contactNotes table with user authorship tracking and timestamps
- **API Endpoints**: Added contact notes API endpoints for creating, fetching, updating, and deleting notes with user attribution
- **Interactive Notes Display**: Built ContactNotes dialog component with real-time updates and user names
- **Notes Tab Integration**: Added Notes tab to contact detail pages showing all notes directly without requiring button clicks
- **Edit and Delete Functionality**: Added inline editing with textarea and save/cancel buttons, plus delete confirmation
- **Legacy Notes Support**: Maintained compatibility with existing notes field while transitioning to new system
- **Form Cleanup**: Removed Notes field from Add Contact and Edit Contact forms across all tabs
- **User Experience**: Notes now display with timestamps, user attribution, edit/delete actions, and professional formatting
- **Error Handling**: Proper error handling with toast notifications and unauthorized access redirects

### Contact Information Update System Fix (July 14, 2025)
- **Schema Validation Fix**: Updated insertContactSchema to accept nullable values for all optional string fields using .nullable()
- **Database Integration**: Fixed updateContact method to properly handle null values for cleared contact fields
- **Form Data Processing**: Enhanced contact form to convert empty strings to null values for proper database updates
- **Cache Invalidation**: Implemented comprehensive query cache invalidation to ensure immediate UI updates
- **Sidebar Priority Display**: Fixed contact information display priority (cell phone over work phone, personal email over work email)
- **Real-time Updates**: Contact detail sidebar now reflects changes immediately after form submission
- **Validation Cleanup**: Removed temporary debugging code and restored proper form validation
- **Error Resolution**: Fixed "Expected string, received null" validation errors that prevented successful contact updates

### Complete File Management System Implementation (July 14, 2025)
- **Database Schema**: Created contactFiles table with comprehensive file metadata and base64 content storage
- **File Upload Processing**: Implemented FileReader API to capture and store complete file content as base64 data
- **Download Functionality**: Built robust download endpoint that serves actual file content with proper MIME types and headers
- **Dual File Types**: Support for both uploaded files (with content storage) and URL links (with redirect handling)
- **File Operations**: Complete CRUD operations including rename, delete, and download with user attribution
- **Integration**: Seamlessly integrated ContactFiles component into contact detail Files tab
- **Error Handling**: Comprehensive error handling with toast notifications and fallback mechanisms
- **Performance**: Efficient file handling with proper content-type detection and browser download triggers
- **User Experience**: Professional file management interface with file type icons, size display, and intuitive controls

### Hierarchical Task Management System Enhancement (July 17, 2025)
- **Section-Based Task Organization**: Implemented 3-level hierarchy (Sections → Tasks → Sub-tasks → Sub-sub-tasks)
- **Clickable Task Navigation**: Task titles are now clickable buttons that navigate to detailed task pages (`/task/[id]`)
- **Expand/Collapse Functionality**: Added chevron arrows for expanding/collapsing sub-tasks with proper state management
- **Task Detail Pages**: Complete task detail pages with task information, subtasks, and navigation breadcrumbs
- **Team Member Assignment Display**: Fixed team member badges appearing next to task titles when assigned
- **Server-Side Validation Fix**: Proper string-to-number conversion for assignedTo field without validation errors
- **State Management**: Separate expandedTasks state using Set to track which tasks are expanded/collapsed
- **Clean Task Display**: Removed task descriptions from task rows for cleaner, more focused interface
- **Progress Tracking**: Task completion toggles work properly with real-time progress bar updates

### CSR Project Template Creation (July 17, 2025)
- **Template Database Integration**: Created comprehensive CSR project template based on actual Lynn & Ted Smith project
- **Hierarchical Structure**: Preserved Planning Phase and Execution Phase sections with proper task relationships
- **Task Organization**: Maintained 3-level task hierarchy with parent-child relationships
- **Template Availability**: Template accessible through Templates section for creating new CSR projects
- **Milestone Integration**: Created template milestones and tasks with proper database relationships

### Project Date Handling Fix (July 17, 2025)
- **Timezone Issue Resolution**: Fixed date picker showing one day earlier than selected date
- **Proper UTC Conversion**: Added correct timezone conversion between database (UTC) and date input (local time)
- **Date Display Accuracy**: Project due dates now display exactly as selected without timezone offset
- **Data Integrity**: Maintained existing project dates while fixing future date operations
- **Input Field Correction**: Date input field now shows correct local date when editing project due dates

### Project Due Date Formula Fix (July 14, 2025)
- **Task Offset Storage**: Fixed task creation to store original meeting date offsets in task descriptions
- **Correct Negative Offsets**: Tasks now properly use negative day offsets (like -64, -63, -61) so tasks occur BEFORE meeting dates
- **Formula-Based Recalculation**: When project due dates change, all task due dates recalculate using original template offsets
- **Cache Invalidation Fix**: Implemented refresh key approach to force UI updates when due dates change
- **UI Cleanup**: Removed unnecessary "Created" date from project information section
- **Template Data Alignment**: Fixed frontend to use correct `daysFromMeeting` property from template data instead of incorrect `dueDateOffset`

### Task Management UX Enhancement (July 17, 2025)
- **Contacts-Style Toggle Interface**: Replaced filter dropdowns with toggle buttons matching Contacts page pattern ("My Tasks" and "All Tasks")
- **Numeric Priority System**: Implemented 1-50 priority scale with proper server-side validation and display
- **Assignee Sorting**: Added team member assignment sorting option alongside priority, due date, and title
- **Assignment Processing Fix**: Fixed "Assign to Me" functionality to properly map to current user's contact ID
- **Active Team Members Only**: Filtered task assignment dropdown to show only active team members
- **Status Functionality Removal**: Removed complex status system while maintaining completion tracking
- **Completion Filter Toggles**: Added "All" and "Completed" toggle buttons for task completion status
- **Server-Side Assignment Logic**: Fixed POST, PUT, and PATCH routes to properly handle "me_" and "team_" assignment prefixes

### Dynamic Role Column Display Enhancement (July 14, 2025)
- **Conditional Column Display**: Made Role column in contacts table view conditional based on selected contact types
- **Smart UI Logic**: Role column only appears when Strategic Partners and/or Team Members are selected to be displayed
- **Clean Table View**: When showing only Clients and Prospects, Role column is hidden since those contact types don't have role information
- **Dynamic Responsiveness**: Column automatically shows/hides based on which contact types are currently visible through filter toggles
- **User Experience**: Provides cleaner, more relevant table layout that adapts to user's current filtering preferences

### Contact Management UI Enhancements (July 13, 2025)
- **Role Information Display**: Added role information to contact cards and table rows for Strategic Partners and Team Members
- **Show Button Reordering**: Reordered Show buttons to: Clients, Prospects, Strategic Partners, Team Members
- **Role Column Addition**: Added Role column to the contact table with proper formatting for team members and strategic partners
- **Specialized Contact Detail Sidebars**: Created left sidebar for Strategic Partners and Team Members with profile picture, status dropdown, and action buttons
- **Dynamic Tab Labels**: Changed tab labels to be contact-type specific: "Client", "Prospect", "Partner", "Member"
- **Layout Optimization**: Strategic Partners and Team Members have Address Information positioned to the right of Contact Information to save space
- **Consistent Photo Upload UI**: Added camera icon button to all contact types for photo uploads, removed "Upload Photo" buttons from all sidebars
- **Sidebar Navigation**: Positioned "Back to Contacts" button above profile pictures for Strategic Partners and Team Members
- **State Preservation**: Implemented back navigation that preserves contacts page state (filters, sort order, view mode, search query)
- **URL Parameter Handling**: Enhanced URL parameter system to maintain user selections when navigating between contacts and contact details

### Asana Template Import with Due Date Formulas (July 12, 2025)
- **CSV Import Processing**: Successfully imported complete CSR Meeting Template from user's formatted CSV
- **Template Structure**: Created comprehensive project template with 229 tasks organized by workflow phases
- **Hierarchical Organization**: Preserved exact milestone → task → sub-task → sub-sub-task structure from CSV
- **Task Organization**: Structured tasks into logical sections (Confirming & Scheduling, Preparing for Meetings, DRPM, Team Coordination, Client Service Rep tasks, Progress Meeting, Post-Meeting)
- **Detailed Descriptions**: Maintained all original task names and descriptions without modification
- **Priority Mapping**: Mapped task priorities (high/medium/low) based on workflow criticality and coded tasks (CSR01, AM01, etc.)
- **Due Date Formula System**: Implemented automatic due date calculation based on meeting date offset formulas
- **Team Coordination**: Includes deliverables for Estate Attorney, Financial Planner, Insurance Planners, Tax Planner, and Money Manager
- **Meeting Workflow**: Complete CSR (Comprehensive Safety Review) meeting workflow from initial scheduling to post-meeting follow-up
- **Project Creation from Template**: Added "Create Project" functionality that automatically calculates all task due dates based on specified meeting date
- **Template Availability**: Template available in ClientHub Templates section with "Create Project" button for formula-based project creation

### Profile Image Display Fix (July 17, 2025)
- **Fixed Photo Upload Bug**: Corrected `handleFileSelect` function in contact detail page to properly save uploaded images to database
- **Database Integration**: Profile images now save to `profileImageUrl` field via POST `/api/contacts/:id/photo` endpoint
- **File Size Validation**: Added 5MB file size limit with proper error handling
- **Base64 Storage**: Images converted to base64 format and stored directly in database
- **Real-time Updates**: Profile images display immediately on contacts page after upload with proper cache invalidation
- **Team Member Photos**: Team members' profile pictures now properly display on contacts page after uploading through contact detail pages

### Contact Information Priority Display (July 17, 2025)
- **Email Priority Logic**: Contacts page now displays personal email first, falls back to work email if personal is empty
- **Phone Priority Logic**: Contacts page now displays cell phone first, falls back to work phone if cell is empty
- **Consistent Across Views**: Priority logic applied to both card view and table view for consistent user experience
- **Clean Display**: Only shows available contact information, no empty fields displayed

### Task Assignment Dropdown Fix (July 17, 2025)
- **Eliminated Duplicate User Entries**: Fixed task assignment dropdown to show only "Assign to Me" without duplicate user name
- **Smart User Filtering**: Current user is automatically filtered out from team members list when "Assign to Me" option is present
- **Consistent Across Components**: Applied fix to both task form and section task manager components
- **Clean Assignment Interface**: Dropdown now shows "Unassigned", "Assign to Me", and other team members without duplication