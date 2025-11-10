#!/usr/bin/env node

/**
 * Sprint Status Viewer
 * 
 * Displays current status of all sprints in a readable format
 * 
 * Usage: node scripts/sprint-status.js
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  masterFile: path.join(__dirname, '../documentation/SPRINT-MASTER.md')
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseStatusTable() {
  const content = fs.readFileSync(CONFIG.masterFile, 'utf8');
  
  // Find the status table
  const tableRegex = /\| Sprint \d+ \|(.*?)\|(.*?)\|(.*?)\|(.*?)\|/g;
  const sprints = [];
  
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    sprints.push({
      name: match[0].split('|')[1].trim(),
      focus: match[1].trim(),
      points: parseInt(match[2].trim()),
      status: match[3].trim(),
      progress: match[4].trim()
    });
  }
  
  return sprints;
}

function displayStatus() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║           UniPDF Studio - Sprint Status Dashboard              ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan');

  const sprints = parseStatusTable();
  
  sprints.forEach((sprint, index) => {
    const sprintNum = index + 1;
    const barLength = 30;
    const progress = parseInt(sprint.progress) || 0;
    const filled = Math.round((progress / 100) * barLength);
    const empty = barLength - filled;
    
    const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
    const statusColor = sprint.status.includes('✅') ? 'green' : 'yellow';
    
    log(`┌─ Sprint ${sprintNum}: ${sprint.focus}`, 'blue');
    log(`│  Story Points: ${sprint.points}`, 'cyan');
    log(`│  Status: ${sprint.status}`, statusColor);
    log(`│  Progress: [${progressBar}] ${sprint.progress}`, 
        progress === 0 ? 'red' : progress < 100 ? 'yellow' : 'green');
    log('└─────────────────────────────────────────────────────────────\n', 'blue');
  });

  // Summary statistics
  const totalPoints = sprints.reduce((sum, s) => sum + s.points, 0);
  const avgPoints = Math.round(totalPoints / sprints.length);
  
  log('╔════════════════════════════════════════════════════════════════╗', 'magenta');
  log('║                        Summary Statistics                       ║', 'magenta');
  log('╠════════════════════════════════════════════════════════════════╣', 'magenta');
  log(`║  Total Sprints: ${sprints.length}                                                   ║`, 'magenta');
  log(`║  Total Story Points: ${totalPoints}                                           ║`, 'magenta');
  log(`║  Average Points per Sprint: ${avgPoints}                                     ║`, 'magenta');
  log(`║  Project Duration: 14 weeks                                     ║`, 'magenta');
  log('╚════════════════════════════════════════════════════════════════╝\n', 'magenta');

  log('💡 Tips:', 'yellow');
  log('  • Run "npm run sync-sprints" to apply changes from SPRINT-MASTER.md');
  log('  • Run "npm run validate-sprints" to check for issues');
  log('  • Check SPRINT-CHANGELOG.md for detailed change history\n');
}

// Run the status display
if (require.main === module) {
  try {
    displayStatus();
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

module.exports = { displayStatus, parseStatusTable };
