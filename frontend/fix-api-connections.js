// This script updates the frontend API connection URLs
// Save as 'fix-api-connections.js' and run with: node fix-api-connections.js

const fs = require('fs');
const path = require('path');

// Files to update
const filesToUpdate = [
  'src/components/ConnectionTester.js',
  'src/pages/HomePage.js', 
  'src/pages/PracticePage.js',
  'src/DebugInfo.js',
  'src/services/api.js'
];

// Function to update a file
const updateFile = (filePath) => {
  try {
    console.log(`Checking ${filePath}...`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`  File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Replace hardcoded IP addresses with localhost
    content = content.replace(/http:\/\/188\.136\.27\.4:5002\/api/g, 'http://localhost:5002/api');
    
    // Update API_URL declarations
    content = content.replace(
      /const API_URL = ['"].*['"]/g, 
      "const API_URL = 'http://localhost:5002/api'"
    );
    
    // If content was changed, write it back
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`  ✅ Updated ${filePath}`);
      return true;
    } else {
      console.log(`  ⏭️  No changes needed in ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error updating ${filePath}:`, error.message);
    return false;
  }
};

// Update package.json to add proxy
const updatePackageJson = () => {
  const packagePath = 'package.json';
  
  try {
    console.log(`Checking ${packagePath}...`);
    
    if (!fs.existsSync(packagePath)) {
      console.log(`  File not found: ${packagePath}`);
      return false;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Add proxy if it doesn't exist
    if (!packageJson.proxy || packageJson.proxy !== 'http://localhost:5002') {
      packageJson.proxy = 'http://localhost:5002';
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      console.log(`  ✅ Added proxy to ${packagePath}`);
      return true;
    } else {
      console.log(`  ⏭️  Proxy already set in ${packagePath}`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error updating ${packagePath}:`, error.message);
    return false;
  }
};

// Main function
const main = () => {
  console.log('🔧 TypeSpark Frontend Connection Fixer 🔧\n');
  
  let changedFiles = 0;
  
  // Process each file
  filesToUpdate.forEach(file => {
    if (updateFile(file)) {
      changedFiles++;
    }
  });
  
  // Update package.json
  if (updatePackageJson()) {
    changedFiles++;
  }
  
  // Summary
  console.log('\n📝 Summary:');
  console.log(`  ${changedFiles} file(s) updated`);
  
  if (changedFiles > 0) {
    console.log('\n⚠️  Restart your frontend application to apply changes:');
    console.log('  1. Stop the current React development server (Ctrl+C)');
    console.log('  2. Start it again with: npm start');
  }
  
  console.log('\nAdditional troubleshooting tips:');
  console.log('1. Make sure the backend is running on port 5002');
  console.log('2. Check that the backend CORS configuration is correct');
  console.log('3. Clear your browser cache or try an incognito window');
  console.log('4. Open the browser console (F12) to see detailed errors');
};

// Run the script
main();