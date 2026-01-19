/**
 * Weather Feature Types
 *
 * This file contains all TypeScript types for the weather feature.
 * Based on Open-Meteo API response structure.
 */

export interface WeatherLocation {
  latitude: number
  longitude: number
  city: string
}

export interface CurrentWeather {
  time: string
  interval: number
  temperature_2m: number
  wind_speed_10m: number
}

export interface CurrentUnits {
  time: string
  interval: string
  temperature_2m: string
  wind_speed_10m: string
}

export interface HourlyWeather {
  time: string[]
  temperature_2m: number[]
  relative_humidity_2m: number[]
  wind_speed_10m: number[]
}

export interface HourlyUnits {
  time: string
  temperature_2m: string
  relative_humidity_2m: string
  wind_speed_10m: string
}

export interface WeatherResponse {
  latitude: number
  longitude: number
  generationtime_ms: number
  utc_offset_seconds: number
  timezone: string
  timezone_abbreviation: string
  elevation: number
  current_units: CurrentUnits
  current: CurrentWeather
  hourly_units: HourlyUnits
  hourly: HourlyWeather
}

export interface WeatherError {
  message: string
  code?: string
}
