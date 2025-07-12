# CSV Import Format Guide

To ensure perfect import without any modifications, please format your CSV with these exact columns:

## Required Columns (in this order):
1. **task_id** - Unique identifier (can be numbers like 1, 2, 3...)
2. **task_name** - Exact task name (no quotes needed)
3. **parent_task_name** - Name of parent task (leave empty for top-level tasks)
4. **description** - Task description
5. **priority** - high, medium, or low
6. **estimated_days** - Number (1, 2, 3, etc.)
7. **section** - Optional section grouping

## Example Format:
```csv
task_id,task_name,parent_task_name,description,priority,estimated_days,section
1,Confirm Meeting Date & Time with Client,,Confirm meeting details,high,1,Scheduling
2,Administrative Manager,Nominations and Deliverable Checkpoints Due,Administrative tasks,medium,1,DRPM
3,AM01 Confirm Date of Meeting With Client 80 Days Prior,Administrative Manager,Confirm 80 days prior,high,1,DRPM
4,Client Service Rep - Meeting Packets,Nominations and Deliverable Checkpoints Due,Meeting packet prep,medium,1,DRPM
5,CSR01 Confirm Status of Last Meeting's Action Items,Client Service Rep - Meeting Packets,Confirm action items,high,1,DRPM
```

## Key Rules:
- **parent_task_name** must match exactly with an existing task_name
- Leave parent_task_name empty for top-level tasks
- Use exact task names without quotes
- Keep coded tasks (CSR01, AM01, etc.) exactly as they are
- Maintain your original hierarchy structure

Would you like me to help you convert your current spreadsheet to this format?