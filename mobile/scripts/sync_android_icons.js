const path = require('path');
const { setIconAsync } = require('../node_modules/@expo/prebuild-config/build/plugins/icons/withAndroidIcons');

async function run() {
  const projectRoot = path.resolve(__dirname, '..');
  console.log('Syncing Android icons for project at:', projectRoot);
  
  await setIconAsync(projectRoot, {
    icon: path.resolve(projectRoot, 'assets/icon.png'),
    foregroundImage: path.resolve(projectRoot, 'assets/android-icon-foreground.png'),
    backgroundColor: '#FFFFFF',
    backgroundImage: path.resolve(projectRoot, 'assets/android-icon-background.png'),
    monochromeImage: path.resolve(projectRoot, 'assets/android-icon-monochrome.png'),
    isAdaptive: true
  });
  
  console.log('Android mipmap icons successfully updated!');
}

run().catch(err => {
  console.error('Error syncing icons:', err);
  process.exit(1);
});
