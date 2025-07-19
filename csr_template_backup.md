# CSR Meeting Template - Complete Configuration Backup
**Date Created:** July 19, 2025  
**Template ID:** 13  
**Status:** Production Ready - All Settings Preserved

## Template Overview
- **Name:** CSR Meeting Template
- **Description:** Used to create projects that help the team prepare for a CSR progress meeting with a client.
- **Meeting Type:** csr
- **Total Tasks:** 149 tasks across 6 milestones
- **Created By:** 44905818 (Chad Tennant)
- **Last Updated:** 2025-07-19 02:58:00

## Milestone Structure (6 Sections)
1. **Actions & Service Since Last Progress Meeting** (Milestone ID: 106, Sort Order: 1) - 0 tasks
2. **Confirming & Scheduling Meeting Dates & Times** (Milestone ID: 26, Sort Order: 2) - 4 tasks
3. **Preparing for & Gathering Information for Meetings** (Milestone ID: 27, Sort Order: 3) - 6 tasks
4. **Preparing for DRPM** (Milestone ID: 28, Sort Order: 4) - 134 tasks
5. **Preparing for Progress Meeting** (Milestone ID: 29, Sort Order: 5) - 4 tasks
6. **After Progress Meeting** (Milestone ID: 30, Sort Order: 6) - 1 task

## Key Template Features Preserved

### Hierarchical Task Structure
- **3-Level Task Hierarchy:** Sections → Tasks → Sub-tasks → Sub-sub-tasks
- **Parent-Child Relationships:** Properly maintained with parent_task_id fields
- **Professional Role Tasks:** Estate Attorney, Financial Planner, Insurance Planners, etc.
- **Deliverable Sub-tasks:** Organized under professional role parent tasks

### Date Assignment System
- **P-Day Reference System:** All tasks calculate due dates relative to CSR Meeting date
- **Days from Meeting Values:** Range from -80 days (early preparation) to +1 day (post-meeting)
- **DRPM Dependency System:** Special tasks that depend on DRPM task completion
- **Automatic Recalculation:** When meeting date changes, all task dates update automatically

### Role-Based Assignment System
- **Multi-Role Support:** Tasks can be assigned to multiple roles simultaneously
- **Available Roles:** Accountant, Admin Assistant, Client Service Rep, Deliverables Team Coordinator, Estate Attorney, Financial Planner, Human Relations, Insurance Business, Insurance Health, Insurance Life/LTC/Disability, Insurance P&C, Money Manager, Tax Planner, Trusted Advisor, Other
- **Template-to-Project Resolution:** Role assignments automatically resolve to active team members during project creation

### Task Priority and Organization
- **Chronological Ordering:** Tasks automatically sort by daysFromMeeting (earliest first)
- **Priority Levels:** 1-50 scale with default priority 25
- **Sort Order Preservation:** Maintains logical task sequence within sections
- **Conditional Date Fields:** Level 3+ sub-tasks don't show date management fields

## Critical System Components Preserved

### 1. P-Day Dependency System
- **CSR Meeting Task:** Acts as P-Day reference (P-Day = meeting date)
- **Dependent Task Calculation:** All tasks with daysFromMeeting values recalculate when CSR Meeting date changes
- **Automatic Updates:** 47 tasks automatically update when meeting date is modified
- **Project Due Date Integration:** Editing project due date updates CSR Meeting task and triggers cascade

### 2. Template Editor Features
- **Drag-and-Drop Reordering:** Full drag-and-drop functionality for all task hierarchy levels
- **Inline Task Editing:** Click-to-edit titles and descriptions
- **Date Field Management:** Smart hiding/showing of date fields based on task level
- **Multi-Select Assignments:** Support for assigning tasks to multiple people and roles

### 3. Project Creation Logic
- **Two-Pass Creation:** Non-dependent tasks created first, then dependent tasks
- **Hierarchical Preservation:** All parent-child relationships maintained during project creation
- **Chronological Task Ordering:** Tasks created in proper temporal sequence
- **Role Resolution:** Multi-role assignments resolve to appropriate active team members

### 4. Navigation and State Management
- **Fast Client-Side Routing:** All navigation uses wouter's setLocation for instant transitions
- **Hierarchical State Persistence:** localStorage preserves expanded/collapsed sections per project
- **Browser History Integration:** Back button maintains exact previous hierarchical state
- **Cross-Page Navigation:** Seamless navigation between task details and project views

## Database Schema Dependencies
- **project_templates** table: Core template metadata
- **milestones** table: Section organization with template_id foreign key
- **tasks** table: Complete task hierarchy with parent_task_id, depends_on_task_id, milestone_id
- **Foreign Key Relationships:** Properly maintained for data integrity

## User Interface Features
- **Conditional Badge Display:** P-format badges (P-21, P-Day, P+1) with color coding
- **Due Date Styling:** Overdue (red), today (yellow), future (default), completed (green)
- **Collapsible Sections:** Default collapsed state with chevron controls
- **Task Completion Toggle:** Real-time completion status with progress tracking

## Template Editing Safeguards
- **Date Logic Separation:** Templates use day offsets, projects use calculated dates
- **Sub-task Date Restrictions:** Level 3+ tasks don't allow individual due date setting
- **Professional Role Distribution:** Correct assignment of tasks to -21 day and -12 day groups
- **Dependency Chain Validation:** DRPM dependencies properly validated during creation

## Production Settings Status
✅ **Template Structure:** Complete 6-milestone, 149-task hierarchy preserved  
✅ **Role Assignments:** Multi-role system fully functional  
✅ **P-Day Dependencies:** Automatic date calculation system working  
✅ **Project Creation:** Template-to-project conversion tested and verified  
✅ **Navigation Performance:** Fast client-side routing implemented  
✅ **State Persistence:** Hierarchical view state properly maintained  
✅ **User Interface:** All editing and viewing features operational  

## Future Project Creation
All settings are preserved for creating new CSR projects from this template. The template maintains:
- Complete task hierarchy and relationships
- Proper role-based assignments that resolve to active team members
- Automatic due date calculation based on meeting date
- Professional deliverable organization
- Fast navigation and state management
- Full editing capabilities for customization

This template is ready for production use and will generate fully functional CSR projects with all advanced features intact.