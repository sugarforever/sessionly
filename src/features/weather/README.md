# Weather Feature

A demonstration of API integration in Electron applications.

## Overview

This feature shows Beijing's local weather using the Open-Meteo API. It demonstrates:
- Making HTTP requests from the renderer process
- Handling loading and error states
- Auto-refreshing data
- TypeScript type safety for API responses
- Clean, encapsulated feature structure

## Structure

```
features/weather/
├── README.md          # This file
├── types.ts           # TypeScript types for API responses
├── config.ts          # Configuration (location, API URL, refresh interval)
└── useWeather.ts      # Custom React hook for fetching weather data
```

## Usage

### In a Component

```typescript
import { useWeather } from '@/features/weather/useWeather'
import { DEFAULT_LOCATION } from '@/features/weather/config'

function MyComponent() {
  const { data, loading, error, refetch } = useWeather(DEFAULT_LOCATION)

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>Temperature: {data?.current.temperature_2m}°C</div>
}
```

### API Response Type

```typescript
interface WeatherResponse {
  current: {
    time: string
    temperature_2m: number
    wind_speed_10m: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    relative_humidity_2m: number[]
    wind_speed_10m: number[]
  }
  // ... more fields
}
```

## Configuration

Edit `config.ts` to customize:

```typescript
// Change location
export const DEFAULT_LOCATION: WeatherLocation = {
  latitude: 40.7128,  // New York
  longitude: -74.0060,
  city: 'New York',
}

// Change refresh interval (milliseconds)
export const WEATHER_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

// Add more weather parameters
export const WEATHER_API_PARAMS = {
  current: 'temperature_2m,wind_speed_10m,precipitation',
  hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation',
}
```

## API Details

**Provider**: [Open-Meteo](https://open-meteo.com)
- Free and open-source
- No API key required
- No rate limits for reasonable use
- Returns data in metric units by default

**Endpoint**: `https://api.open-meteo.com/v1/forecast`

**Parameters**:
- `latitude` - Location latitude
- `longitude` - Location longitude
- `current` - Current weather parameters
- `hourly` - Hourly forecast parameters

## Why No IPC?

This feature makes API calls directly from the renderer process because:

1. **Public API**: No API keys to protect
2. **Simpler**: No need for main process handlers
3. **Faster**: Direct HTTP requests without IPC overhead
4. **Standard**: Works like any React web app

**When to use IPC for APIs:**
- API requires secret keys
- Need to access Node.js modules
- Need to store credentials securely
- Want to cache responses in main process

## Removing This Feature

To completely remove the weather feature:

1. Delete `src/features/weather/` folder
2. Delete `src/pages/WeatherPage.tsx`
3. Remove from `src/config/navigation.tsx`:
   ```typescript
   { id: 'weather', label: 'Weather', icon: Cloud }
   ```
4. Remove from `src/components/PageRouter.tsx`:
   ```typescript
   import { WeatherPage } from '@/pages/WeatherPage'
   // and
   weather: WeatherPage,
   ```

## Extending This Feature

### Add More Locations

Create a location selector:

```typescript
const locations = [
  { latitude: 39.9042, longitude: 116.4074, city: 'Beijing' },
  { latitude: 40.7128, longitude: -74.0060, city: 'New York' },
  { latitude: 51.5074, longitude: -0.1278, city: 'London' },
]

const [selectedLocation, setSelectedLocation] = useState(locations[0])
const { data } = useWeather(selectedLocation)
```

### Add More Weather Data

Update `config.ts` parameters:

```typescript
export const WEATHER_API_PARAMS = {
  current: 'temperature_2m,wind_speed_10m,precipitation,cloud_cover',
  hourly: 'temperature_2m,precipitation_probability,cloud_cover',
  daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
}
```

Update `types.ts` to include new fields.

### Store in Redux

Add weather state to Redux if you need to share across components:

```typescript
// store/slices/weatherSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const weatherSlice = createSlice({
  name: 'weather',
  initialState: { data: null, lastFetch: null },
  reducers: {
    setWeatherData(state, action: PayloadAction<WeatherResponse>) {
      state.data = action.payload
      state.lastFetch = new Date().toISOString()
    },
  },
})
```

## License

This feature uses data from Open-Meteo which is provided under CC BY 4.0 license.
