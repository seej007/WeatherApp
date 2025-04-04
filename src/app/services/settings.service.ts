import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject } from 'rxjs';

export interface WeatherSettings {
  useCelsius: boolean;
  enableNotifications: boolean;
  darkMode: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private settings = new BehaviorSubject<WeatherSettings>({
    useCelsius: true,
    enableNotifications: true,
    darkMode: false
  });

  settings$ = this.settings.asObservable();

  constructor() {
    this.loadSettings();
  }

  async loadSettings() {
    const { value } = await Preferences.get({ key: 'weather-settings' });
    if (value) {
      this.settings.next(JSON.parse(value));
    }
  }

  async saveSettings(newSettings: WeatherSettings) {
    await Preferences.set({
      key: 'weather-settings',
      value: JSON.stringify(newSettings)
    });
    this.settings.next(newSettings);
  }

  convertTemperature(celsius: number): number {
    const current = this.settings.getValue();
    return current.useCelsius ? celsius : (celsius * 9) / 5 + 32;
  }

  // Add a public getter for the current settings
  getCurrentSettings(): WeatherSettings {
    return this.settings.getValue();
  }
}