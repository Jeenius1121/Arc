// The version shown to players ("1.7.0") is `expo.version` in app.json and is
// bumped by hand: major for a redesign, minor for new features, patch for
// fixes. BUILD_NUMBER, set by the APK workflow (GitHub run number), becomes
// the Android versionCode and is what the app compares to find updates.
const buildNumber = Number(process.env.BUILD_NUMBER || 0);

module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, versionCode: Math.max(buildNumber, 1) },
  extra: { ...config.extra, buildNumber },
});
