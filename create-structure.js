const fs = require('fs');
const path = require('path');
const { program } = require('commander');

// Configure command line options
program
  .option('-d, --dry-run', 'Preview changes without making them')
  .option('-v, --verbose', 'Display detailed logs')
  .option('-s, --safe', 'Safe mode - skip existing files rather than reporting them', true)
  .parse(process.argv);

const options = program.opts();
const isDryRun = options.dryRun;
const isVerbose = options.verbose;
const isSafeMode = options.safe;

// Define the directory structure for Ripple Effect
const directories = [
  'actions/db',
  'actions/storage',
  'app/(auth)/login/[[...login]]',
  'app/(auth)/signup/[[...signup]]',
  'app/ripple/_components',
  'app/ripple',
  'app/api',
  'components/ui',
  'components/ripple',
  'components/utilities',
  'db/schema',
  'lib/hooks',
  'public',
  'types'
];

// Define the files to create - only add new files specific to Ripple Effect
const files = [
  // Server actions - only new ones
  'actions/db/deeds-actions.ts',
  'actions/storage/avatar-storage-actions.ts',
  
  // Add Ripple specific pages
  'app/ripple/page.tsx',
  'app/ripple/layout.tsx',
  'app/ripple/_components/deed-form.tsx',
  'app/ripple/_components/deed-list.tsx',
  'app/ripple/_components/ripple-map.tsx',
  'app/ripple/_components/ripple-stats.tsx',
  
  // DB Schemas - only new ones
  'db/schema/deeds-schema.ts',
  
  // Ripple specific components
  'components/ripple/ripple-animation.tsx',
  'components/ripple/water-animation.tsx',
  'components/ripple/ripple-card.tsx',
  'components/ripple/ripple-timeline.tsx',
  
  // Types
  'types/ripple-types.ts',
];

// Lists of critical files we should never overwrite
const criticalFiles = [
  'app/layout.tsx',
  'db/db.ts',
  'components/utilities/providers.tsx'
];

console.log('Creating directory structure and files for Ripple Effect...');

// Create directories
let dirCreatedCount = 0;
let dirExistCount = 0;

directories.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    if (!isDryRun) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        dirCreatedCount++;
        console.log(`Created directory: ${dir}`);
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error.message);
      }
    } else {
      dirCreatedCount++;
      console.log(`[DRY RUN] Would create directory: ${dir}`);
    }
  } else {
    dirExistCount++;
    if (isVerbose) {
      console.log(`Directory already exists: ${dir}`);
    }
  }
});

// Create files
let fileCreatedCount = 0;
let fileExistCount = 0;
let fileSkippedCount = 0;

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  // Skip critical files if they exist
  if (criticalFiles.includes(file) && fs.existsSync(filePath)) {
    fileSkippedCount++;
    console.log(`Skipping critical file: ${file}`);
    return;
  }
  
  if (!fs.existsSync(filePath)) {
    // Create parent directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir) && !isDryRun) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create empty file
    if (!isDryRun) {
      try {
        fs.writeFileSync(filePath, '');
        fileCreatedCount++;
        console.log(`Created file: ${file}`);
      } catch (error) {
        console.error(`Error creating file ${file}:`, error.message);
      }
    } else {
      fileCreatedCount++;
      console.log(`[DRY RUN] Would create file: ${file}`);
    }
  } else {
    if (isSafeMode) {
      fileSkippedCount++;
      if (isVerbose) {
        console.log(`File already exists, skipping: ${file}`);
      }
    } else {
      fileExistCount++;
      if (isVerbose) {
        console.log(`File already exists: ${file}`);
      }
    }
  }
});

console.log('\nSummary:');
if (isDryRun) {
  console.log(`[DRY RUN] Would create ${dirCreatedCount} directories and ${fileCreatedCount} files`);
  console.log(`${dirExistCount} directories and ${fileExistCount} files already exist`);
  console.log(`${fileSkippedCount} files would be skipped`);
} else {
  console.log(`Created ${dirCreatedCount} directories and ${fileCreatedCount} files`);
  console.log(`${dirExistCount} directories and ${fileExistCount} files already exist`);
  console.log(`${fileSkippedCount} files skipped for safety`);
}
console.log('Directory structure and files ' + (isDryRun ? 'would be ' : '') + 'created successfully for Ripple Effect!');