/**
 * Weather Page
 *
 * Demonstrates API integration in Electron app.
 * Shows current weather and hourly forecast for Beijing.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWeather } from '@/features/weather/useWeather'
import { DEFAULT_LOCATION } from '@/features/weather/config'
import {
  Cloud,
  Thermometer,
  Wind,
  Droplets,
  RefreshCw,
  MapPin,
  AlertCircle,
  Loader2,
} from 'lucide-react'

export function WeatherPage() {
  const { data, loading, error, refetch } = useWeather(DEFAULT_LOCATION)

  // Format temperature
  const formatTemp = (temp: number) => `${Math.round(temp)}°C`

  // Format time from ISO string
  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
  }

  // Get next 12 hours of forecast
  const getNext12Hours = () => {
    if (!data?.hourly) return []

    const now = new Date()
    const currentHour = now.getHours()

    return data.hourly.time
      .map((time, index) => ({
        time,
        temperature: data.hourly.temperature_2m[index],
        humidity: data.hourly.relative_humidity_2m[index],
        windSpeed: data.hourly.wind_speed_10m[index],
      }))
      .slice(currentHour, currentHour + 12)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-bold tracking-tight">Local Weather</h1>
            {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-2 text-lg text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <span>{DEFAULT_LOCATION.city}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {DEFAULT_LOCATION.latitude.toFixed(2)}°N, {DEFAULT_LOCATION.longitude.toFixed(2)}°E
            </Badge>
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Failed to load weather data</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Weather */}
      {data?.current && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-6 w-6" />
              Current Conditions
            </CardTitle>
            <CardDescription>
              Updated at {new Date(data.current.time).toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Temperature */}
              <div className="flex items-center gap-4 rounded-lg border p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <Thermometer className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Temperature</p>
                  <p className="text-3xl font-bold">{formatTemp(data.current.temperature_2m)}</p>
                </div>
              </div>

              {/* Wind Speed */}
              <div className="flex items-center gap-4 rounded-lg border p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <Wind className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Wind Speed</p>
                  <p className="text-3xl font-bold">
                    {data.current.wind_speed_10m}
                    <span className="ml-1 text-lg font-normal text-muted-foreground">km/h</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hourly Forecast */}
      {data?.hourly && (
        <Card>
          <CardHeader>
            <CardTitle>12-Hour Forecast</CardTitle>
            <CardDescription>Hourly weather predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getNext12Hours().map((hour, index) => (
                <div
                  key={hour.time}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  {/* Time */}
                  <div className="w-20">
                    <p className="font-medium">{formatTime(hour.time)}</p>
                    <p className="text-xs text-muted-foreground">
                      {index === 0 ? 'Now' : `+${index}h`}
                    </p>
                  </div>

                  {/* Temperature */}
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatTemp(hour.temperature)}</span>
                  </div>

                  {/* Humidity */}
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{hour.humidity}%</span>
                  </div>

                  {/* Wind */}
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{hour.windSpeed} km/h</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Info */}
      <Card>
        <CardHeader>
          <CardTitle>About This Feature</CardTitle>
          <CardDescription>Example of API integration in Electron</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 font-semibold">Data Source</h3>
            <p className="text-sm text-muted-foreground">
              Weather data from{' '}
              <a
                href="https://open-meteo.com"
                className="text-primary underline-offset-4 hover:underline"
                onClick={(e) => {
                  e.preventDefault()
                  window.electron.openExternal('https://open-meteo.com')
                }}
              >
                Open-Meteo API
              </a>{' '}
              - A free, open-source weather API with no authentication required.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Implementation</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>
                <code className="rounded bg-muted px-1 py-0.5">useWeather</code> custom hook for
                data fetching
              </li>
              <li>Direct API calls from renderer process (no IPC needed for public APIs)</li>
              <li>Auto-refresh every 10 minutes</li>
              <li>Loading and error states handled</li>
              <li>TypeScript types for API response</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">How to Remove This Feature</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>
                Delete <code className="rounded bg-muted px-1 py-0.5">src/features/weather/</code>{' '}
                folder
              </li>
              <li>
                Remove{' '}
                <code className="rounded bg-muted px-1 py-0.5">src/pages/WeatherPage.tsx</code>
              </li>
              <li>
                Remove weather entry from{' '}
                <code className="rounded bg-muted px-1 py-0.5">src/config/navigation.tsx</code>
              </li>
              <li>
                Remove from{' '}
                <code className="rounded bg-muted px-1 py-0.5">src/components/PageRouter.tsx</code>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
