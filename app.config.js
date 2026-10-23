// BUILD_NUMBER is set by the APK workflow (GitHub run number): it becomes the
// Android versionCode and lets the app compare itself with the latest release.
const buildNumber = Number(process.env.BUILD_NUMBER || 0);

module.exports = ({ config }) => ({
  ...config,
  version: buildNumber ? `1.0.${buildNumber}` : config.version,
  android: { ...config.android, versionCode: Math.max(buildNumber, 1) },
  extra: { ...config.extra, buildNumber },
});
