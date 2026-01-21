const { notarize } = require('@electron/notarize')

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context

  // Only notarize macOS builds
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization - not macOS')
    return
  }

  // Skip notarization in CI if credentials are not set
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    console.log('Skipping notarization - APPLE_ID or APPLE_APP_SPECIFIC_PASSWORD not set')
    console.log('To enable notarization, set these environment variables:')
    console.log('  APPLE_ID=your-apple-id@email.com')
    console.log('  APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx')
    console.log('  APPLE_TEAM_ID=YOUR_TEAM_ID')
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`

  console.log(`Notarizing ${appPath}...`)

  try {
    await notarize({
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    })
    console.log('Notarization complete!')
  } catch (error) {
    console.error('Notarization failed:', error)
    throw error
  }
}
