import { Component, OnInit } from '@angular/core';
import { SettingsService, WeatherSettings } from '../services/settings.service';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  settings: WeatherSettings = {
    useCelsius: true,
    enableNotifications: true,
    darkMode: false
  }; // Initialize with default values

  constructor(private settingsService: SettingsService, private navCtrl: NavController) {}

  ngOnInit() {
    // Subscribe to the settings$ observable to get the current settings
    this.settingsService.settings$.subscribe((currentSettings) => {
      if (currentSettings) {
        this.settings = { ...currentSettings }; // Create a copy of the settings
      }
    });
  }

  async saveSettings() {
    await this.settingsService.saveSettings(this.settings);
  }

  async toggleDarkMode() {
    document.body.classList.toggle('dark', this.settings.darkMode);
    // Update status bar color if on a mobile device
    if (this.settings.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }  
    // Save the settings immediately
    await this.settingsService.saveSettings(this.settings);
  }
}
