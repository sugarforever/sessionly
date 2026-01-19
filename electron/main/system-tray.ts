import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron'
import path from 'node:path'
import { VITE_PUBLIC } from './index'

export function createSystemTray(mainWindow: BrowserWindow | null): Tray {
  // Create tray icon (you should add a proper icon file in public/icons/)
  const iconPath = path.join(VITE_PUBLIC, 'icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })

  const tray = new Tray(icon)
  tray.setToolTip('Electron Boilerplate')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'Preferences',
      click: () => {
        mainWindow?.show()
        mainWindow?.webContents.send('navigate-to', '/settings')
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'About',
      role: 'about',
    },
    {
      type: 'separator',
    },
    {
      label: 'Quit',
      click: () => {
        ;(app as { isQuitting?: boolean }).isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  // Show window on tray icon click (Windows/Linux)
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  return tray
}
