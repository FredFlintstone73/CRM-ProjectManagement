# CSV Structure Fix Guide

## Current Issues with Your CSV

1. **Text wrapping issues**: Long descriptions are being split across multiple rows
2. **Hierarchy confusion**: The CSV parser is treating description fragments as separate tasks
3. **Column misalignment**: Some cells have shifted content

## How to Fix Your CSV

### 1. Clean Up Cell Content
- **Problem**: Cells with long text are wrapping and creating extra rows
- **Solution**: Put all text for one task in a single cell, use quotes if needed

### 2. Fix the Column Structure
Your CSV should have these exact columns:
```
Milestone | Parent Task | Parent Description | Sub-Task | Sub-Task Description | Sub-Sub-Task | Sub-Sub-Task Description | Assignee | Due Date | Comments
```

### 3. Remove Broken Rows
Delete any rows that contain only text fragments like:
- "including"
- "even if they will not be earmarked"
- "not before"
- "such as estate taxes"
- etc.

### 4. Sample Correct Format
```csv
Milestone,Parent Task,Parent Description,Sub-Task,Sub-Task Description,Sub-Sub-Task,Sub-Sub-Task Description,Assignee,Due Date,Comments
"Confirming & Scheduling Meeting Dates & Times","Confirm Meeting Date & Time with Client","Full description here","","","","","","10/12/2025",""
"Preparing for & Gathering Information for Meetings","Submit Items Still Needed","Description","Estate Attorney","Enter Items Still Needed","","","","10/31/2025",""
```

### 5. Key Rules
- Each row = one complete task
- Use quotes around cells with commas or long text
- Keep descriptions in their proper columns
- Don't split tasks across multiple rows
- Remove any orphaned text fragments

## Quick Fix Method
1. Open CSV in Excel/Sheets
2. Look for rows with only 1-2 words (these are fragments)
3. Delete those rows
4. Merge split descriptions back into single cells
5. Verify each row represents one complete task

Would you like me to help you create a cleaned-up version of your CSV?