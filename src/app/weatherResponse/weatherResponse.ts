export interface WeatherResponse {
    list: Forecast[];
    dailyForecasts?: DailyForecast[];
    hourlyForecasts?: HourlyForecast[];
}

export interface Forecast {
   dx_stn_id: string;
   main: {
        temp: number;
        humidity: number;
   };
   weather: [{
    description: string;
    icon: string;
   }];
   wind?: {
    speed: number;
    direction: string;
   };
   pressure?: number;
   feelsLike?: number;
   uvIndex?: number;
}

export interface DailyForecast {
    date: string;
    day: {
        icon: number;
        iconPhrase: string;
        hasPrecipitation: boolean;
    };
    temperature: {
        minimum: {
            value: number;
            unit: string;
        };
        maximum: {
            value: number;
            unit: string;
        };
    };
}

export interface HourlyForecast {
    dateTime: string;
    weatherIcon: number;
    iconPhrase: string;
    temperature: {
        value: number;
        unit: string;
    };
    precipitationProbability: number;
}

export interface WeatherSettings {
    useCelsius: boolean;
    enableNotifications: boolean;
    darkMode: boolean;
    offlineCacheExpiry: number;
}

export interface AccuWeatherLocation {
    Key: string;
    LocalizedName: string;
    Country: {
        LocalizedName: string;
    };
}

export interface AccuWeatherForecast {
    Pressure: any;
    Temperature: {
        Metric: {
            Value: number;
            Unit: string;
        };
    };
    WeatherIcon: number;
    WeatherText: string;
    RelativeHumidity: number;
    Wind: {
        Direction: {
            Degrees: number;
            Localized: string;
        };
        Speed: {
            Metric: {
                Value: number;
                Unit: string;
            };
        };
    };
    UVIndex: number;
    PressureTendency: {
        LocalizedText: string;
    };
    RealFeelTemperature: {
        Metric: {
            Value: number;
        };
    };
}