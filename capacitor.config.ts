import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.weatherapp',
  appName: 'WeatherApp',
  webDir: 'www', 
  server: {
    androidScheme: 'https',
  },
  plugins: {
    geolocation: {
      Permissions: true 
      }
    }
};

export default config;
