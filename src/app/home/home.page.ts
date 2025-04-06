import { Component, OnInit, OnDestroy } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { HttpClient } from '@angular/common/http';
import { App } from '@capacitor/app';
import { SettingsService } from '../services/settings.service';
import { Subscription } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { weatherAPI } from '../../weatherAPI/weatherAPI';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  weather: any = { list: [] };
  location: Position | null = null;
  loading = true;
  error: string | null = null;
  isOffline = false;
  lastUpdated: Date | null = null;
  searchTerm: string = '';
  searchResults: any[] = [];
  selectedLocation: any = null;
  
  private networkSubscription: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private settingsService: SettingsService
  ) {}

  ngOnInit() {
    // Check online status
    this.isOffline = !navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Back online');
      this.isOffline = false;
      this.refresh();
    });
    
    window.addEventListener('offline', () => {
      console.log('Gone offline');
      this.isOffline = true;
    });
    
    // Apply dark mode
    this.settingsService.settings$.subscribe((settings) => {
      document.body.classList.toggle('dark', settings.darkMode);
    });
    
    this.checkPermissions();
  }

  ngOnDestroy() {
    // Remove event listeners
    window.removeEventListener('online', () => {});
    window.removeEventListener('offline', () => {});
    
    if (this.networkSubscription) {
      this.networkSubscription.unsubscribe();
    }
  }

  async searchLocation() {
    if (!this.searchTerm || this.searchTerm.trim().length < 2) {
      return;
    }
    
    try {
      this.loading = true;
      
      
      const API_KEY = weatherAPI.accuweatherApiKey;
      const searchUrl = `http://dataservice.accuweather.com/locations/v1/cities/search?apikey=${API_KEY}&q=${encodeURIComponent(this.searchTerm)}`;
      
      const results: any[] = (await this.http.get<any[]>(searchUrl).toPromise()) || [];
      console.log('Location search results:', results);
      this.error = null;
      
      this.searchResults = results || [];
      this.loading = false;
    } catch (error) {
      console.error('Error searching locations:', error);
      this.error = 'Unable to search for locations. Please try again later.';
      this.loading = false;
    }
  }
  async selectLocation(location: any) {
    this.selectedLocation = location;
    this.searchTerm = location.LocalizedName;
    this.searchResults = [];
  }

  async clearSearch() {
    this.searchTerm = '';
    this.searchResults = [];
  }

  async checkPermissions() {
    try {
      // First check if we're offline and have cached data
      if (this.isOffline) {
        await this.loadCachedWeatherData();
        return;
      }
      
      // Check location permissions
      const status = await Geolocation.checkPermissions();
      
      if (status.location === 'granted') {
        await this.getCurrentPosition();
      } else {
        try {
          const request = await Geolocation.requestPermissions();
          if (request.location === 'granted') {
            await this.getCurrentPosition();
          } else {
            this.error = 'Location permission denied. Please enable location services.';
            this.loading = false;
            
            // Try to load cached data if permission is denied
            await this.loadCachedWeatherData();
          }
        } catch (permErr) {
          // Fall back to direct getCurrentPosition which will trigger browser's permission dialog
          await this.getCurrentPosition();
        }
      }
    } catch (error) {
      this.error = 'Permission error: ' + (error instanceof Error ? error.message : 'Unknown error');
      this.loading = false;
      
      // Try to load cached data if there was an error
      await this.loadCachedWeatherData();
    }
  }

  async getCurrentPosition() {
    try {
      this.loading = true;
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000 // Increase timeout to 10 seconds
      });
      
      this.location = coordinates;
      console.log('Location:', this.location);
      
      if (coordinates && coordinates.coords) {
        await this.getWeather(coordinates.coords.latitude, coordinates.coords.longitude);
      } else {
        throw new Error('Invalid coordinates');
      }
    } catch (error) {
      console.error('Position error:', error);
      this.error = 'Unable to retrieve your location. Please check your device settings.';
      this.loading = false;
      
      // Try to load cached data if there was an error
      await this.loadCachedWeatherData();
    }
  }

  async getWeather(lat: number, lon: number) {
    try {
      const API_KEY = weatherAPI.accuweatherApiKey;
      
      console.log('Fetching location key...');
      const locationUrl = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${API_KEY}&q=${lat},${lon}`;
      const locationResponse: any = await this.http.get(locationUrl).toPromise();
      console.log('Location response:', locationResponse);
      
      if (!locationResponse || !locationResponse.Key) {
        throw new Error('Invalid location response');
      }
      
      console.log('Fetching weather data...');
      const weatherUrl = `https://dataservice.accuweather.com/currentconditions/v1/${locationResponse.Key}?apikey=${API_KEY}&details=true`;
      const weatherResponse: any = await this.http.get(weatherUrl).toPromise();
      console.log('Weather response:', weatherResponse);
      
      if (!weatherResponse || weatherResponse.length === 0) {
        throw new Error('Invalid weather response');
      }
      
      // Fetch 5-day forecast
      console.log('Fetching 5-day forecast...');
      const forecastUrl = `https://dataservice.accuweather.com/forecasts/v1/daily/5day/${locationResponse.Key}?apikey=${API_KEY}&metric=true`;
      const forecastResponse: any = await this.http.get(forecastUrl).toPromise();
      console.log('Forecast response structure:', Object.keys(forecastResponse || {}));
      console.log('DailyForecasts exists:', forecastResponse?.DailyForecasts ? 'Yes' : 'No');
      console.log('DailyForecasts length:', forecastResponse?.DailyForecasts?.length || 0);
      
      // Fetch hourly forecast
      console.log('Fetching hourly forecast...');
      const hourlyUrl = `https://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${locationResponse.Key}?apikey=${API_KEY}&metric=true`;
      const hourlyResponse: any = await this.http.get(hourlyUrl).toPromise();
      console.log('Hourly response is array:', Array.isArray(hourlyResponse));
      console.log('Hourly response length:', hourlyResponse?.length || 0);
      
      // Create the weather object
      this.weather = {
        list: [{
          dx_stn_id: locationResponse.Key,
          main: {
            temp: weatherResponse[0].Temperature.Metric.Value,
            humidity: weatherResponse[0].RelativeHumidity
          },
          weather: [{
            description: weatherResponse[0].WeatherText,
            icon: weatherResponse[0].WeatherIcon.toString()
          }],
          wind: {
            speed: weatherResponse[0].Wind?.Speed?.Metric?.Value || 0,
            direction: weatherResponse[0].Wind?.Direction?.Localized || 'N/A'
          },
          pressure: weatherResponse[0]?.Pressure?.Metric?.Value || 0,
          feelsLike: weatherResponse[0]?.RealFeelTemperature?.Metric?.Value || weatherResponse[0].Temperature.Metric.Value,
          uvIndex: weatherResponse[0]?.UVIndex || 0
        }]
      };
      
      // Add daily forecasts if available
      if (forecastResponse && forecastResponse.DailyForecasts && forecastResponse.DailyForecasts.length > 0) {
        console.log('Adding daily forecasts');
        this.weather.dailyForecasts = forecastResponse.DailyForecasts;
      } else {
        console.log('No daily forecasts available');
      }
      
      // Add hourly forecasts if available
      if (hourlyResponse && Array.isArray(hourlyResponse) && hourlyResponse.length > 0) {
        console.log('Adding hourly forecasts');
        this.weather.hourlyForecasts = hourlyResponse;
      } else {
        console.log('No hourly forecasts available');
      }
      
      console.log('Final weather object:', this.weather);
      
      // Save the weather data for offline use
      await this.saveWeatherData(this.weather);
      this.lastUpdated = new Date();
      
      this.loading = false;
      this.error = null;
    } catch (error) {
      console.error('Error fetching weather:', error);
      this.error = 'Unable to fetch weather data. Please try again later.';
      this.loading = false;
      
      // Try to load cached data if there was an error
      await this.loadCachedWeatherData();
    }
  }
  
  async saveWeatherData(data: any): Promise<void> {
    try {
      await Preferences.set({
        key: 'last-weather-data',
        value: JSON.stringify(data)
      });
      
      // Save timestamp
      await Preferences.set({
        key: 'last-weather-timestamp',
        value: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving weather data:', error);
    }
  }

  async loadCachedWeatherData() {
    try {
      const { value: dataString } = await Preferences.get({ key: 'last-weather-data' });
      const { value: timestampString } = await Preferences.get({ key: 'last-weather-timestamp' });
      
      if (dataString) {
        this.weather = JSON.parse(dataString);
        this.lastUpdated = timestampString ? new Date(timestampString) : null;
        this.loading = false;
        this.error = null;
        console.log('Loaded cached weather data from:', this.lastUpdated);
      } else if (this.loading) {
        this.error = 'No cached weather data available. Please connect to the internet.';
        this.loading = false;
      }
    } catch (error) {
      console.error('Error loading cached weather data:', error);
      if (this.loading) {
        this.error = 'Unable to load weather data. Please check your connection.';
        this.loading = false;
      }
    }
  }

  getTemperature(celsius: number): string {
    if (celsius === undefined || celsius === null) {
      return 'N/A';
    }
    
    const temp = this.settingsService.convertTemperature(celsius);
    const useCelsius = this.settingsService.getCurrentSettings().useCelsius;
    return `${temp.toFixed(1)}${useCelsius ? '°C' : '°F'}`;
  }

  getWeatherIcon(description: string): string {
    if (!description) return 'cloudy-outline';
    // Convert description to lowercase for case-insensitive matching
    const desc = description.toLowerCase();
    
    if (desc.includes('sunny') || desc.includes('clear')) {
      return 'sunny-outline';
    } else if (desc.includes('partly') && (desc.includes('sunny') || desc.includes('cloudy'))) {
      return 'partly-sunny-outline';
    } else if (desc.includes('cloudy') || desc.includes('clouds')) {
      return 'cloud-outline';
    } else if (desc.includes('rain') || desc.includes('shower')) {
      return 'rainy-outline';
    } else if (desc.includes('thunderstorm') || desc.includes('thunder')) {
      return 'thunderstorm-outline';
    } else if (desc.includes('snow') || desc.includes('flurries')) {
      return 'snow-outline';
    } else if (desc.includes('fog') || desc.includes('mist') || desc.includes('haze')) {
      return 'cloud-outline';
    } else {
      return 'cloudy-outline'; // Default icon
    }
  }

  formatHour(dateTimeString: string): string {
    if (!dateTimeString) return '';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error('Error formatting hour:', e);
      return '';
    }
  }

  formatDay(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    } catch (e) {
      console.error('Error formatting day:', e);
      return '';
    }
  }
  
  formatLastUpdated(): string {
    if (!this.lastUpdated) return '';
    
    const now = new Date();
    const diff = now.getTime() - this.lastUpdated.getTime();
    
    // Less than a minute ago
    if (diff < 60 * 1000) {
      return 'just now';
    }
    
    // Less than an hour ago
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }
    
    // Less than a day ago
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    
    // Format as date
    return this.lastUpdated.toLocaleString();
  }

  refresh() {
    this.loading = true;
    this.error = null;
    this.checkPermissions();
  }

  async exitApp() {
    await App.exitApp();
  }
}