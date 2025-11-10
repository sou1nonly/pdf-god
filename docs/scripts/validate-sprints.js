#!/usr/bin/env node

/**
 * Sprint Validation Script
 * 
 * Validates sprint data for consistency and potential issues
 * 
 * Usage: node scripts/validate-sprints.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONFIG = {
  masterFile: path.join(__dirname, '../documentation/SPRINT-MASTER.md'),
  sprintsDir: path.join(__dirname, '../documentation/steps')
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class SprintValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  validate() {
    log('\n🔍 Validating Sprint Configuration...', 'cyan');
    log('═══════════════════════════════════════\n', 'cyan');

    this.validateMasterFileExists();
    this.validateMasterFileSyntax();
    this.validateSprintFiles();
    this.validateStoryPoints();
    this.validatePriorities();
    this.validateDuplicates();

    this.displayResults();
  }

  validateMasterFileExists() {
    if (!fs.existsSync(CONFIG.masterFile)) {
      this.errors.push('SPRINT-MASTER.md not found');
      return false;
    }
    this.info.push('✓ Master file exists');
    return true;
  }

  validateMasterFileSyntax() {
    try {
      const content = fs.readFileSync(CONFIG.masterFile, 'utf8');
      
      // Check for YAML blocks
      const yamlBlocks = content.match(/```yaml\n([\s\S]*?)```/g);
      
      if (!yamlBlocks || yamlBlocks.length === 0) {
        this.errors.push('No YAML configuration blocks found in master file');
        return false;
      }

      // Validate each YAML block
      yamlBlocks.forEach((block, index) => {
        try {
          const yamlContent = block.replace(/```yaml\n/, '').replace(/```$/, '');
          yaml.load(yamlContent);
          this.info.push(`✓ YAML block ${index + 1} is valid`);
        } catch (error) {
          this.errors.push(`Invalid YAML syntax in block ${index + 1}: ${error.message}`);
        }
      });

      return true;
    } catch (error) {
      this.errors.push(`Failed to read master file: ${error.message}`);
      return false;
    }
  }

  validateSprintFiles() {
    const expectedFiles = [
      'SPRINT-1-Project-Setup-Foundation.md',
      'SPRINT-2-File-Upload-PDF-Rendering.md',
      'SPRINT-3-PDF-Editing-Tools.md',
      'SPRINT-4-AI-Features.md',
      'SPRINT-5-OCR-File-Management.md',
      'SPRINT-6-Collaboration-Cloud.md',
      'SPRINT-7-Polish-Testing-Deployment.md'
    ];

    expectedFiles.forEach((file, index) => {
      const filePath = path.join(CONFIG.sprintsDir, file);
      if (fs.existsSync(filePath)) {
        this.info.push(`✓ Sprint ${index + 1} file exists`);
      } else {
        this.warnings.push(`Sprint ${index + 1} file missing: ${file}`);
      }
    });
  }

  validateStoryPoints() {
    try {
      const content = fs.readFileSync(CONFIG.masterFile, 'utf8');
      const yamlBlocks = content.match(/```yaml\n([\s\S]*?)```/g);

      if (!yamlBlocks) return;

      yamlBlocks.forEach((block, sprintIndex) => {
        const yamlContent = block.replace(/```yaml\n/, '').replace(/```$/, '');
        const stories = yaml.load(yamlContent);

        let sprintTotal = 0;

        Object.entries(stories).forEach(([storyId, story]) => {
          const points = story.story_points;

          // Check if story points exist
          if (points === undefined) {
            this.errors.push(`${storyId} missing story_points`);
            return;
          }

          // Check if valid number
          if (typeof points !== 'number' || points < 0) {
            this.errors.push(`${storyId} has invalid story_points: ${points}`);
            return;
          }

          // Check Fibonacci sequence (common practice)
          const validPoints = [1, 2, 3, 5, 8, 13, 21];
          if (!validPoints.includes(points)) {
            this.warnings.push(`${storyId} uses non-Fibonacci points: ${points}`);
          }

          sprintTotal += points;
        });

        // Check sprint total
        if (sprintTotal > 50) {
          this.warnings.push(`Sprint ${sprintIndex + 1} has high story points: ${sprintTotal} (consider reducing scope)`);
        } else if (sprintTotal < 15) {
          this.warnings.push(`Sprint ${sprintIndex + 1} has low story points: ${sprintTotal} (consider adding more work)`);
        } else {
          this.info.push(`✓ Sprint ${sprintIndex + 1} has reasonable story points: ${sprintTotal}`);
        }
      });
    } catch (error) {
      this.errors.push(`Failed to validate story points: ${error.message}`);
    }
  }

  validatePriorities() {
    try {
      const content = fs.readFileSync(CONFIG.masterFile, 'utf8');
      const yamlBlocks = content.match(/```yaml\n([\s\S]*?)```/g);

      if (!yamlBlocks) return;

      const validPriorities = ['Critical', 'High', 'Medium', 'Low'];

      yamlBlocks.forEach((block) => {
        const yamlContent = block.replace(/```yaml\n/, '').replace(/```$/, '');
        const stories = yaml.load(yamlContent);

        Object.entries(stories).forEach(([storyId, story]) => {
          if (!story.priority) {
            this.errors.push(`${storyId} missing priority`);
          } else if (!validPriorities.includes(story.priority)) {
            this.errors.push(`${storyId} has invalid priority: ${story.priority}`);
          }
        });
      });

      this.info.push('✓ All priorities are valid');
    } catch (error) {
      this.errors.push(`Failed to validate priorities: ${error.message}`);
    }
  }

  validateDuplicates() {
    try {
      const content = fs.readFileSync(CONFIG.masterFile, 'utf8');
      const yamlBlocks = content.match(/```yaml\n([\s\S]*?)```/g);

      if (!yamlBlocks) return;

      const allStoryIds = new Set();
      const duplicates = new Set();

      yamlBlocks.forEach((block) => {
        const yamlContent = block.replace(/```yaml\n/, '').replace(/```$/, '');
        const stories = yaml.load(yamlContent);

        Object.keys(stories).forEach(storyId => {
          if (allStoryIds.has(storyId)) {
            duplicates.add(storyId);
            this.errors.push(`Duplicate story ID found: ${storyId}`);
          } else {
            allStoryIds.add(storyId);
          }
        });
      });

      if (duplicates.size === 0) {
        this.info.push('✓ No duplicate story IDs found');
      }
    } catch (error) {
      this.errors.push(`Failed to check for duplicates: ${error.message}`);
    }
  }

  displayResults() {
    log('\n═══════════════════════════════════════\n', 'cyan');
    log('📊 Validation Results:\n', 'cyan');

    // Display errors
    if (this.errors.length > 0) {
      log(`❌ Errors (${this.errors.length}):`, 'red');
      this.errors.forEach(error => log(`   • ${error}`, 'red'));
      log('');
    }

    // Display warnings
    if (this.warnings.length > 0) {
      log(`⚠️  Warnings (${this.warnings.length}):`, 'yellow');
      this.warnings.forEach(warning => log(`   • ${warning}`, 'yellow'));
      log('');
    }

    // Display info
    if (this.info.length > 0) {
      log(`ℹ️  Info (${this.info.length}):`, 'cyan');
      this.info.forEach(info => log(`   ${info}`, 'cyan'));
      log('');
    }

    // Summary
    log('═══════════════════════════════════════', 'cyan');
    if (this.errors.length === 0 && this.warnings.length === 0) {
      log('✅ All validations passed!', 'green');
      log('🚀 Your sprint configuration is ready!', 'green');
      process.exit(0);
    } else if (this.errors.length === 0) {
      log('✅ No critical errors found', 'green');
      log('⚠️  Please review warnings', 'yellow');
      process.exit(0);
    } else {
      log('❌ Validation failed with errors', 'red');
      log('Please fix the errors before syncing', 'red');
      process.exit(1);
    }
  }
}

// Run validation
if (require.main === module) {
  const validator = new SprintValidator();
  validator.validate();
}

module.exports = SprintValidator;
