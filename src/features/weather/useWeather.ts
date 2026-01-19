/**
 * Weather Hook
 *
 * Custom React hook for fetching weather data from Open-Meteo API.
 * Handles loading states, errors, and automatic refresh.
 */

import { useState, useEffect, useCallback } from 'react'
import type { WeatherResponse, WeatherError, WeatherLocation } from './types'
import { WEATHER_API_URL, WEATHER_API_PARAMS, WEATHER_REFRESH_INTERVAL } from './config'

interface UseWeatherResult {
  data: WeatherResponse | null
  loading: boolean
  error: WeatherError | null
  refetch: () => Promise<void>
}

export function useWeather(location: WeatherLocation): UseWeatherResult {
  const [data, setData] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<WeatherError | null>(null)

  const fetchWeather = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Build API URL with parameters
      const url = new URL(WEATHER_API_URL)
      url.searchParams.append('latitude', location.latitude.toString())
      url.searchParams.append('longitude', location.longitude.toString())
      url.searchParams.append('current', WEATHER_API_PARAMS.current)
      url.searchParams.append('hourly', WEATHER_API_PARAMS.hourly)

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const weatherData: WeatherResponse = await response.json()
      setData(weatherData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather data'
      setError({ message: errorMessage })
      console.error('Weather API error:', err)
    } finally {
      setLoading(false)
    }
  }, [location.latitude, location.longitude])

  // Initial fetch
  useEffect(() => {
    fetchWeather()
  }, [fetchWeather])

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWeather()
    }, WEATHER_REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchWeather])

  return {
    data,
    loading,
    error,
    refetch: fetchWeather,
  }
}
