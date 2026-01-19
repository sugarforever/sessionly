/**
 * Weather Feature Configuration
 *
 * Change these constants to customize the weather feature.
 */

import type { WeatherLocation } from './types'

// Default location: Beijing, China
export const DEFAULT_LOCATION: WeatherLocation = {
  latitude: 39.9042,
  longitude: 116.4074,
  city: 'Beijing',
}

// API endpoint
export const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast'

// API parameters
export const WEATHER_API_PARAMS = {
  current: 'temperature_2m,wind_speed_10m',
  hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
}

// Refresh interval (in milliseconds)
export const WEATHER_REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes
