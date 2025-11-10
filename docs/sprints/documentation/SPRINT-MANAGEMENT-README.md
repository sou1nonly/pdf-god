# Sprint Management System - User Guide

## 📚 Overview

This is a comprehensive sprint management system that allows you to manage all 7 sprints of the UniPDF Studio project from a single master file, with automatic change logging and validation.

## 🗂️ File Structure

```
documentation/
├── SPRINT-MASTER.md          # Master control file (edit this!)
├── SPRINT-CHANGELOG.md        # Automatic change log
├── SPRINT-MANAGEMENT-README.md # This file
├── backups/                   # Automatic backups
│   └── [timestamp]/          # Backup snapshots
└── steps/                     # Individual sprint files
    ├── SPRINT-1-Project-Setup-Foundation.md
    ├── SPRINT-2-File-Upload-PDF-Rendering.md
    ├── SPRINT-3-PDF-Editing-Tools.md
    ├── SPRINT-4-AI-Features.md
    ├── SPRINT-5-OCR-File-Management.md
    ├── SPRINT-6-Collaboration-Cloud.md
    └── SPRINT-7-Polish-Testing-Deployment.md

scripts/
├── sync-sprints.js            # Main sync script
├── sprint-status.js           # View sprint status
└── validate-sprints.js        # Validate configuration
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install js-yaml
```

### 2. Make the Scripts Executable

```bash
chmod +x scripts/*.js
```

### 3. View Current Status

```bash
npm run sprint-status
```

## 📝 How to Use

### Viewing Sprint Information

**View Status Dashboard:**
```bash
npm run sprint-status
```

This displays:
- All sprint overview
- Story points per sprint
- Progress bars
- Summary statistics

**View Change History:**
```bash
cat documentation/SPRINT-CHANGELOG.md
```

### Making Changes

**Step 1: Edit SPRINT-MASTER.md**

Open `documentation/SPRINT-MASTER.md` and make your changes in the YAML blocks.

**Step 2: Validate Changes**

```bash
npm run validate-sprints
```

This checks for:
- ✅ Valid YAML syntax
- ✅ Valid story points
- ✅ Valid priorities
- ✅ No duplicate story IDs
- ⚠️ Sprint capacity warnings

**Step 3: Sync Changes**

```bash
npm run sync-sprints
```

This will:
- 📦 Create automatic backup
- 🔍 Detect all changes
- ✏️ Apply changes to sprint files
- 📝 Update changelog automatically
- 📊 Show summary statistics

## 🎯 Common Tasks

### Adding a New User Story

1. Open `SPRINT-MASTER.md`
2. Find the appropriate sprint section
3. Add to the YAML block:

```yaml
US-X.Y:
  title: "Your New Feature"
  story_points: 5
  priority: High
  status: active
  tasks:
    - Task 1
    - Task 2
    - Task 3
```

4. Run: `npm run validate-sprints`
5. Run: `npm run sync-sprints`

### Modifying Story Points

1. Find the user story in `SPRINT-MASTER.md`
2. Change the `story_points` value:

```yaml
US-2.3:
  story_points: 13  # Changed from 8
  modification_reason: "Added complexity after review"
```

3. Run sync script

### Removing a User Story

1. Change status to `removed`:

```yaml
US-4.5:
  status: removed
  reason: "Not needed for MVP"
  removed_date: "2025-11-04"
```

2. Run sync script

### Adding Tasks to Existing Story

```yaml
US-3.1:
  tasks:
    - Existing task 1
    - Existing task 2
    - NEW TASK: Additional requirement  # Prefix with "NEW TASK:"
    - NEW TASK: Another new task
```

### Changing Priority

```yaml
US-2.1:
  priority: Critical  # Changed from High
  priority_change_reason: "Blocking other features"
```

## 📊 Understanding the Changelog

The changelog automatically tracks:

- ✅ **CREATED** - New user stories
- 📝 **MODIFIED** - Updated stories
- ❌ **REMOVED** - Deleted stories
- 📊 **POINTS_CHANGED** - Story point adjustments
- 🎯 **PRIORITY_CHANGED** - Priority changes

Each entry includes:
- Timestamp
- Change type
- Sprint number
- Story ID
- Before/after values
- Reason for change
- Impact analysis

## 🔒 Backup System

### Automatic Backups

Backups are created automatically:
- Before every sync operation
- In `documentation/backups/[timestamp]/`
- Includes all sprint files + master + changelog

### Restoring from Backup

```bash
# List available backups
ls documentation/backups/

# Restore from specific backup
cp documentation/backups/2025-11-04T10-30-00/* documentation/steps/
cp documentation/backups/2025-11-04T10-30-00/SPRINT-MASTER.md documentation/
```

## ✅ Validation Rules

### Story Points
- Must be a number
- Should follow Fibonacci sequence: 1, 2, 3, 5, 8, 13, 21
- Sprint total should be 15-50 points

### Priority
- Must be one of: Critical, High, Medium, Low

### Status
- Must be one of: active, removed, completed

### User Story IDs
- Format: US-X.Y (e.g., US-1.1, US-2.3)
- Must be unique across all sprints

## 🎨 Example Workflows

### Workflow 1: Adding a Feature Mid-Sprint

```bash
# 1. Add to SPRINT-MASTER.md
vim documentation/SPRINT-MASTER.md

# 2. Validate
npm run validate-sprints

# 3. Sync
npm run sync-sprints

# 4. Review changes
cat documentation/SPRINT-CHANGELOG.md

# 5. Check status
npm run sprint-status
```

### Workflow 2: Adjusting Sprint Scope

```bash
# 1. Review current status
npm run sprint-status

# 2. Edit story points in SPRINT-MASTER.md
# 3. Move stories between sprints if needed

# 4. Validate changes
npm run validate-sprints

# 5. Sync
npm run sync-sprints
```

### Workflow 3: Sprint Planning Session

```bash
# 1. View current sprint
npm run sprint-status

# 2. Make adjustments in SPRINT-MASTER.md
# 3. Validate
npm run validate-sprints

# 4. Review with team
# 5. Sync when approved
npm run sync-sprints
```

## 🐛 Troubleshooting

### YAML Syntax Error

```
❌ Invalid YAML syntax in block 3
```

**Solution:**
- Check indentation (use 2 spaces, not tabs)
- Check for missing colons
- Check for unescaped special characters
- Run: `npm run validate-sprints` for detailed error

### File Not Found Error

```
❌ SPRINT-MASTER.md not found
```

**Solution:**
- Ensure you're in the project root directory
- Check file path in scripts/sync-sprints.js

### Permission Denied

```
Error: EACCES: permission denied
```

**Solution:**
```bash
chmod +x scripts/*.js
chmod 644 documentation/*.md
```

## 📈 Best Practices

### 1. Always Validate Before Syncing
```bash
npm run validate-sprints && npm run sync-sprints
```

### 2. Review Status Regularly
```bash
npm run sprint-status
```

### 3. Document Reasons for Changes
```yaml
US-X.Y:
  story_points: 8
  modification_reason: "Added OAuth integration complexity"
```

### 4. Keep Master File as Source of Truth
- ✅ Edit `SPRINT-MASTER.md`
- ❌ Don't manually edit sprint files

### 5. Review Changelog Before Meetings
```bash
tail -50 documentation/SPRINT-CHANGELOG.md
```

## 🔧 Advanced Features

### Custom Story Fields

You can add custom fields to user stories:

```yaml
US-X.Y:
  title: "Feature"
  story_points: 5
  priority: High
  status: active
  assignee: "John Doe"
  dependencies: ["US-1.2", "US-2.1"]
  risk_level: "Medium"
  estimated_hours: 20
```

### Bulk Operations

To move multiple stories between sprints:

1. Cut stories from Sprint X
2. Paste into Sprint Y
3. Run sync once (processes all changes)

### Conditional Stories

Mark stories as optional:

```yaml
US-X.Y:
  status: optional
  condition: "If time permits"
  fallback_sprint: 8
```

## 📞 Support

If you encounter issues:

1. Check validation: `npm run validate-sprints`
2. Review recent changes: `cat documentation/SPRINT-CHANGELOG.md`
3. Restore from backup if needed
4. Check script logs for detailed errors

## 🎓 Training

### For New Team Members

1. Read this README
2. Run `npm run sprint-status` to see current state
3. Review `SPRINT-MASTER.md` structure
4. Make a test change (add a comment)
5. Run validation and sync

### For Sprint Masters

1. Master file is your control panel
2. Use validation before every sync
3. Review changelog after each sync
4. Keep backups for 30 days minimum
5. Update status after sprint reviews

## 📊 Metrics and Reporting

### View Project Statistics

Check the changelog for:
- Total story points
- Velocity over time
- Scope changes
- Feature completion rate

### Export Options

You can add export scripts for:
- PDF reports
- Excel spreadsheets
- Jira import format
- JSON API

## 🚀 Next Steps

1. **Customize** - Adjust YAML fields to match your needs
2. **Integrate** - Connect with your project management tools
3. **Automate** - Set up Git hooks for automatic validation
4. **Monitor** - Track metrics over time

---

**Version:** 1.0  
**Last Updated:** November 4, 2025  
**Maintained by:** Sprint Management System

**Happy Sprint Planning! 🎉**
