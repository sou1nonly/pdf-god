# 🎯 Sprint Management System

## Quick Start (30 Seconds)

```bash
# 1. Install dependencies
npm install

# 2. View your sprints
npm run sprint-status

# 3. You're ready!
```

## What This Does

**Manage all 7 sprints from ONE master file with automatic logging!**

- ✅ Edit: `documentation/SPRINT-MASTER.md`
- ✅ Validate: `npm run validate-sprints`
- ✅ Sync: `npm run sync-sprints`
- ✅ Changes auto-logged to `SPRINT-CHANGELOG.md`

## Key Files

| File | Purpose |
|------|---------|
| `documentation/SPRINT-MASTER.md` | ⭐ YOUR CONTROL PANEL - Edit this! |
| `documentation/SPRINT-CHANGELOG.md` | 📝 Auto-generated log of all changes |
| `documentation/steps/SPRINT-*.md` | 📄 Individual sprint files (auto-updated) |

## Commands

```bash
npm run sprint-status      # View dashboard
npm run validate-sprints   # Check for errors
npm run sync-sprints       # Apply changes + log
npm run view-changelog     # See recent changes
npm run full-sync          # All in one!
```

## Example Workflow

```bash
# 1. Edit the master file
vim documentation/SPRINT-MASTER.md

# 2. Validate your changes
npm run validate-sprints

# 3. Sync (creates backup + updates + logs)
npm run sync-sprints

# 4. Check what was logged
npm run view-changelog
```

## Documentation

📖 **Read these in order:**

1. `INSTALLATION-COMPLETE.md` - Start here!
2. `SPRINT-QUICK-REFERENCE.md` - Quick commands
3. `documentation/SPRINT-MANAGEMENT-README.md` - Full guide

## Project Overview

- **7 Sprints** (14 weeks)
- **247 Story Points**
- **35 User Stories**
- **Fully Automated Logging**
- **Automatic Backups**

## Need Help?

```bash
npm run sprint-help
```

---

**Ready? Let's go! ��**

```bash
npm run sprint-status
```
