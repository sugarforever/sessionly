import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron'
import path from 'node:path'
import { VITE_PUBLIC } from './index'
import {
  isPetVisible,
  showPetWindow,
  hidePetWindow,
  getPetSettings,
  setPetSettings,
} from './pet-window'
import { PET_CHARACTER_NAMES } from '../shared/pet-types'
import type { PetCharacter } from '../shared/pet-types'

export function createSystemTray(mainWindow: BrowserWindow | null): Tray {
  // Create tray icon (you should add a proper icon file in public/icons/)
  const iconPath = path.join(VITE_PUBLIC, 'icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })

  const tray = new Tray(icon)
  tray.setToolTip('Sessionly')

  const settings = getPetSettings()

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
      label: 'Pet',
      submenu: [
        {
          label: 'Show Pet',
          type: 'checkbox',
          checked: isPetVisible(),
          click: (menuItem) => {
            if (menuItem.checked) {
              showPetWindow()
            } else {
              hidePetWindow()
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Character',
          submenu: (Object.keys(PET_CHARACTER_NAMES) as PetCharacter[]).map((character) => ({
            label: PET_CHARACTER_NAMES[character],
            type: 'radio' as const,
            checked: settings.character === character,
            click: () => setPetSettings({ character }),
          })),
        },
        {
          label: 'Size',
          submenu: [
            {
              label: 'Small',
              type: 'radio',
              checked: settings.size === 'small',
              click: () => setPetSettings({ size: 'small' }),
            },
            {
              label: 'Medium',
              type: 'radio',
              checked: settings.size === 'medium',
              click: () => setPetSettings({ size: 'medium' }),
            },
            {
              label: 'Large',
              type: 'radio',
              checked: settings.size === 'large',
              click: () => setPetSettings({ size: 'large' }),
            },
          ],
        },
        {
          type: 'separator',
        },
        {
          label: 'Notifications',
          type: 'checkbox',
          checked: settings.notificationsEnabled,
          click: (menuItem) => {
            setPetSettings({ notificationsEnabled: menuItem.checked })
          },
        },
      ],
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
