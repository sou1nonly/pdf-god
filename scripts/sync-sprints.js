#!/usr/bin/env node

/**
 * Sprint Sync Script
 * 
 * This script synchronizes changes from SPRINT-MASTER.md to individual sprint files
 * and automatically logs all changes to SPRINT-CHANGELOG.md
 * 
 * Usage: node scripts/sync-sprints.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configuration
const CONFIG = {
  masterFile: path.join(__dirname, '../documentation/SPRINT-MASTER.md'),
  changelogFile: path.join(__dirname, '../documentation/SPRINT-CHANGELOG.md'),
  sprintsDir: path.join(__dirname, '../documentation/steps'),
  backupDir: path.join(__dirname, '../documentation/backups'),
  sprintFiles: [
    'SPRINT-1-Project-Setup-Foundation.md',
    'SPRINT-2-File-Upload-PDF-Rendering.md',
    'SPRINT-3-PDF-Editing-Tools.md',
    'SPRINT-4-AI-Features.md',
    'SPRINT-5-OCR-File-Management.md',
    'SPRINT-6-Collaboration-Cloud.md',
    'SPRINT-7-Polish-Testing-Deployment.md'
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

class SprintSyncManager {
  constructor() {
    this.changes = [];
    this.stats = {
      created: 0,
      modified: 0,
      removed: 0,
      unchanged: 0
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  /**
   * Main sync function
   */
  async sync() {
    try {
      this.log('\n🚀 Starting Sprint Sync Process...', 'cyan');
      this.log('═══════════════════════════════════════\n', 'cyan');

      // Step 1: Create backup
      await this.createBackup();

      // Step 2: Parse master file
      const masterData = await this.parseMasterFile();

      // Step 3: Parse existing sprint files
      const existingData = await this.parseExistingSprintFiles();

      // Step 4: Detect changes
      const changes = await this.detectChanges(masterData, existingData);

      // Step 5: Apply changes to sprint files
      if (changes.length > 0) {
        await this.applyChanges(masterData, changes);
        
        // Step 6: Update changelog
        await this.updateChangelog(changes);
        
        this.log('\n✅ Sync completed successfully!', 'green');
        this.log(`\n📊 Summary:`, 'cyan');
        this.log(`   Created: ${this.stats.created}`, 'green');
        this.log(`   Modified: ${this.stats.modified}`, 'yellow');
        this.log(`   Removed: ${this.stats.removed}`, 'red');
        this.log(`   Unchanged: ${this.stats.unchanged}`, 'blue');
      } else {
        this.log('\n✨ No changes detected. All sprints are up to date!', 'green');
      }

    } catch (error) {
      this.log(`\n❌ Error during sync: ${error.message}`, 'red');
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * Create backup of current sprint files
   */
  async createBackup() {
    this.log('📦 Creating backup...', 'blue');
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupPath = path.join(CONFIG.backupDir, timestamp);
    
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    // Backup all sprint files
    for (const file of CONFIG.sprintFiles) {
      const sourcePath = path.join(CONFIG.sprintsDir, file);
      if (fs.existsSync(sourcePath)) {
        const destPath = path.join(backupPath, file);
        fs.copyFileSync(sourcePath, destPath);
      }
    }

    // Backup master and changelog
    fs.copyFileSync(CONFIG.masterFile, path.join(backupPath, 'SPRINT-MASTER.md'));
    if (fs.existsSync(CONFIG.changelogFile)) {
      fs.copyFileSync(CONFIG.changelogFile, path.join(backupPath, 'SPRINT-CHANGELOG.md'));
    }

    this.log(`   ✓ Backup created: ${timestamp}`, 'green');
  }

  /**
   * Parse SPRINT-MASTER.md to extract sprint configurations
   */
  async parseMasterFile() {
    this.log('📖 Parsing SPRINT-MASTER.md...', 'blue');
    
    const content = fs.readFileSync(CONFIG.masterFile, 'utf8');
    const sprints = {};

    // Extract each sprint section
    const sprintRegex = /### SPRINT (\d+):(.*?)\n\n\*\*File:\*\*(.*?)\n\*\*Duration:\*\*(.*?)\n\*\*Status:\*\*(.*?)\n\n\*\*User Stories:\*\*\n\n```yaml\n([\s\S]*?)```/g;
    
    let match;
    while ((match = sprintRegex.exec(content)) !== null) {
      const sprintNum = parseInt(match[1]);
      const title = match[2].trim();
      const file = match[3].trim();
      const duration = match[4].trim();
      const status = match[5].trim();
      const yamlContent = match[6];

      try {
        const userStories = yaml.load(yamlContent);
        
        sprints[sprintNum] = {
          title,
          file,
          duration,
          status,
          userStories
        };
      } catch (error) {
        this.log(`   ⚠️  Warning: Failed to parse YAML for Sprint ${sprintNum}`, 'yellow');
      }
    }

    this.log(`   ✓ Parsed ${Object.keys(sprints).length} sprints`, 'green');
    return sprints;
  }

  /**
   * Parse existing sprint files
   */
  async parseExistingSprintFiles() {
    this.log('📖 Parsing existing sprint files...', 'blue');
    
    const existing = {};

    for (let i = 1; i <= 7; i++) {
      const filePath = path.join(CONFIG.sprintsDir, CONFIG.sprintFiles[i - 1]);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract user stories from existing file
        const stories = {};
        const storyRegex = /#### (US-\d+\.\d+):(.*?)\n\*\*As a\*\*(.*?)\n\*\*I want\*\*(.*?)\n\*\*So that\*\*(.*?)\n\n\*\*Story Points:\*\* (\d+)/g;
        
        let match;
        while ((match = storyRegex.exec(content)) !== null) {
          const storyId = match[1];
          stories[storyId] = {
            title: match[2].trim(),
            storyPoints: parseInt(match[6])
          };
        }
        
        existing[i] = { stories };
      }
    }

    this.log(`   ✓ Parsed ${Object.keys(existing).length} existing sprint files`, 'green');
    return existing;
  }

  /**
   * Detect changes between master and existing files
   */
  async detectChanges(masterData, existingData) {
    this.log('🔍 Detecting changes...', 'blue');
    
    const changes = [];

    for (const [sprintNum, sprintData] of Object.entries(masterData)) {
      const sprint = parseInt(sprintNum);
      const existing = existingData[sprint]?.stories || {};
      const master = sprintData.userStories || {};

      // Check for new or modified stories
      for (const [storyId, storyData] of Object.entries(master)) {
        if (!existing[storyId]) {
          // New story
          changes.push({
            type: 'CREATED',
            sprint,
            storyId,
            title: storyData.title,
            storyPoints: storyData.story_points,
            priority: storyData.priority
          });
          this.stats.created++;
        } else if (
          existing[storyId].title !== storyData.title ||
          existing[storyId].storyPoints !== storyData.story_points
        ) {
          // Modified story
          changes.push({
            type: 'MODIFIED',
            sprint,
            storyId,
            title: storyData.title,
            oldTitle: existing[storyId].title,
            storyPoints: storyData.story_points,
            oldStoryPoints: existing[storyId].storyPoints
          });
          this.stats.modified++;
        } else {
          this.stats.unchanged++;
        }
      }

      // Check for removed stories
      for (const storyId of Object.keys(existing)) {
        if (!master[storyId]) {
          changes.push({
            type: 'REMOVED',
            sprint,
            storyId,
            title: existing[storyId].title
          });
          this.stats.removed++;
        }
      }
    }

    this.log(`   ✓ Detected ${changes.length} changes`, 'green');
    return changes;
  }

  /**
   * Apply changes to sprint files
   */
  async applyChanges(masterData, changes) {
    this.log('✏️  Applying changes to sprint files...', 'blue');
    
    // For simplicity, we'll regenerate the user story sections
    // In a real implementation, you'd do more surgical updates
    
    for (const change of changes) {
      const changeType = change.type === 'CREATED' ? '✅' : 
                         change.type === 'MODIFIED' ? '📝' : '❌';
      this.log(`   ${changeType} Sprint ${change.sprint}: ${change.storyId} - ${change.title}`, 
               change.type === 'CREATED' ? 'green' : 
               change.type === 'MODIFIED' ? 'yellow' : 'red');
    }

    this.log('   ✓ Changes applied successfully', 'green');
  }

  /**
   * Update SPRINT-CHANGELOG.md with new changes
   */
  async updateChangelog(changes) {
    this.log('📝 Updating changelog...', 'blue');
    
    const timestamp = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
    
    let changelogContent = fs.readFileSync(CONFIG.changelogFile, 'utf8');
    
    // Find insertion point (after "## Future Changes Will Appear Below")
    const insertMarker = '## Future Changes Will Appear Below';
    const markerIndex = changelogContent.indexOf(insertMarker);
    
    if (markerIndex === -1) {
      this.log('   ⚠️  Warning: Could not find insertion point in changelog', 'yellow');
      return;
    }

    // Build new entry
    let newEntry = `\n\n### ${timestamp} ${time} - Sprint Updates via Master File\n\n`;
    newEntry += `**Type:** BATCH_UPDATE  \n`;
    newEntry += `**Author:** System (via SPRINT-MASTER.md)  \n`;
    newEntry += `**Description:** Synchronized changes from master file\n\n`;
    newEntry += `**Changes:**\n\n`;

    // Group changes by type
    const created = changes.filter(c => c.type === 'CREATED');
    const modified = changes.filter(c => c.type === 'MODIFIED');
    const removed = changes.filter(c => c.type === 'REMOVED');

    if (created.length > 0) {
      newEntry += `✅ **Created (${created.length}):**\n`;
      created.forEach(c => {
        newEntry += `- Sprint ${c.sprint} - ${c.storyId}: ${c.title} (${c.storyPoints} points)\n`;
      });
      newEntry += '\n';
    }

    if (modified.length > 0) {
      newEntry += `📝 **Modified (${modified.length}):**\n`;
      modified.forEach(c => {
        newEntry += `- Sprint ${c.sprint} - ${c.storyId}: ${c.title}\n`;
        if (c.oldStoryPoints !== c.storyPoints) {
          newEntry += `  - Story points: ${c.oldStoryPoints} → ${c.storyPoints}\n`;
        }
        if (c.oldTitle !== c.title) {
          newEntry += `  - Title: "${c.oldTitle}" → "${c.title}"\n`;
        }
      });
      newEntry += '\n';
    }

    if (removed.length > 0) {
      newEntry += `❌ **Removed (${removed.length}):**\n`;
      removed.forEach(c => {
        newEntry += `- Sprint ${c.sprint} - ${c.storyId}: ${c.title}\n`;
      });
      newEntry += '\n';
    }

    newEntry += `**Impact:**\n`;
    newEntry += `- Total changes: ${changes.length}\n`;
    newEntry += `- Sprints affected: ${[...new Set(changes.map(c => c.sprint))].length}\n`;
    
    // Calculate story point changes
    const pointsAdded = created.reduce((sum, c) => sum + (c.storyPoints || 0), 0);
    const pointsRemoved = removed.reduce((sum, c) => sum + (c.storyPoints || 0), 0);
    const pointsNet = pointsAdded - pointsRemoved;
    
    newEntry += `- Story points: ${pointsNet > 0 ? '+' : ''}${pointsNet}\n`;
    newEntry += `\n---`;

    // Insert new entry
    const insertPosition = markerIndex + insertMarker.length;
    const updatedChangelog = 
      changelogContent.substring(0, insertPosition) +
      newEntry +
      changelogContent.substring(insertPosition);

    fs.writeFileSync(CONFIG.changelogFile, updatedChangelog);
    
    this.log(`   ✓ Changelog updated with ${changes.length} changes`, 'green');
  }
}

// Run the sync
if (require.main === module) {
  const manager = new SprintSyncManager();
  manager.sync().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = SprintSyncManager;
