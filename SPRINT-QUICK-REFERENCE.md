# Sprint Management Quick Reference

## 🎯 Most Common Commands

```bash
# View sprint status dashboard
npm run sprint-status

# Validate your changes
npm run validate-sprints

# Sync changes to sprint files (auto-logs)
npm run sync-sprints

# Do all three at once
npm run full-sync

# View recent changes
npm run view-changelog
```

## 📝 Quick Edit Guide

### 1. Add New Feature
```yaml
US-X.Y:
  title: "Feature Name"
  story_points: 5
  priority: High
  status: active
  tasks:
    - Task 1
    - Task 2
```

### 2. Modify Story Points
```yaml
US-2.3:
  story_points: 13  # Changed from 8
```

### 3. Remove Feature
```yaml
US-4.5:
  status: removed
  reason: "Not in MVP"
```

### 4. Change Priority
```yaml
US-1.4:
  priority: Critical  # Changed from High
```

## 🔄 Workflow

```
Edit SPRINT-MASTER.md
        ↓
npm run validate-sprints
        ↓
npm run sync-sprints
        ↓
Changes auto-logged!
```

## 📊 Valid Values

**Story Points:** 1, 2, 3, 5, 8, 13, 21  
**Priority:** Critical, High, Medium, Low  
**Status:** active, removed, completed

## 🆘 Troubleshooting

```bash
# YAML error?
npm run validate-sprints

# Need to undo?
ls documentation/backups/

# View help
npm run sprint-help
```

## 📁 Important Files

- `documentation/SPRINT-MASTER.md` - Edit this!
- `documentation/SPRINT-CHANGELOG.md` - Auto-generated log
- `documentation/steps/SPRINT-*.md` - Individual sprints
- `documentation/backups/` - Automatic backups

## 💡 Pro Tips

✅ Always validate before syncing  
✅ Document reasons for changes  
✅ Review changelog regularly  
✅ Keep backups for 30 days  
❌ Don't edit sprint files directly  
❌ Don't skip validation

## 🎓 First Time Setup

```bash
# 1. Run setup
./setup-sprint-system.sh

# 2. View current status
npm run sprint-status

# 3. Read documentation
cat documentation/SPRINT-MANAGEMENT-README.md
```

## 📞 Need Help?

Read full documentation:
```bash
cat documentation/SPRINT-MANAGEMENT-README.md
```

---

**Version 1.0** | UniPDF Studio Sprint Management System
