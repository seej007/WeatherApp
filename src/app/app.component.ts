import { Component, OnInit } from '@angular/core';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(private settingsService: SettingsService) {}

  ngOnInit() {
    // Subscribe to the settings$ observable to get the current settings
    this.settingsService.settings$.subscribe((settings) => {
        document.body.classList.toggle('dark', settings.darkMode);

        if (settings.darkMode) {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
        else {
          document.documentElement.setAttribute('data-theme', 'light');
        }
    });
  }
}
