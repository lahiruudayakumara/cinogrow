import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  success: boolean;
  coordinates?: LocationCoords;
  error?: string;
}

export interface ManualLocationInput {
  city?: string;
  coordinates?: LocationCoords;
}

class LocationService {
  private manualLocation: LocationCoords | null = null;
  private manualLocationCity: string | null = null;

  /**
   * Set manual location coordinates
   */
  setManualLocation(coordinates: LocationCoords, cityName?: string): void {
    this.manualLocation = coordinates;
    this.manualLocationCity = cityName || null;
  }

  /**
   * Set manual location by city name
   */
  setManualLocationByCity(cityName: string): void {
    this.manualLocationCity = cityName;
    this.manualLocation = null; // Clear coordinates when using city
  }

  /**
   * Clear manual location (will fallback to GPS or default)
   */
  clearManualLocation(): void {
    this.manualLocation = null;
    this.manualLocationCity = null;
  }

  /**
   * Get current manual location
   */
  getManualLocation(): ManualLocationInput | null {
    if (this.manualLocation) {
      return {
        coordinates: this.manualLocation,
        city: this.manualLocationCity || undefined
      };
    }
    if (this.manualLocationCity) {
      return {
        city: this.manualLocationCity
      };
    }
    return null;
  }

  /**
   * Check if manual location is set
   */
  hasManualLocation(): boolean {
    return this.manualLocation !== null || this.manualLocationCity !== null;
  }

  /**
   * Get location - prioritizes manual location, then GPS, then default
   */
  async getCurrentLocation(): Promise<LocationResult> {
    // First check if manual location is set
    if (this.manualLocation) {
      return {
        success: true,
        coordinates: this.manualLocation
      };
    }

    // If manual city is set, return it as a special case
    if (this.manualLocationCity) {
      return {
        success: true,
        coordinates: undefined, // Will be handled by weather service
        error: `manual_city:${this.manualLocationCity}`
      };
    }

    // Fallback to GPS location
    return this.getGPSLocation();
  }

  /**
   * Get GPS location (original getCurrentLocation logic)
   */
  async getGPSLocation(): Promise<LocationResult> {
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Location permission denied'
        };
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        success: true,
        coordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }
      };
    } catch (error) {
      console.error('Error getting GPS location:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get GPS location'
      };
    }
  }

  /**
   * Check if location services are enabled
   */
  async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  /**
   * Show location permission alert with manual entry option
   */
  showLocationPermissionAlert(): void {
    Alert.alert(
      'Location Permission Required',
      'This app needs access to your location to provide accurate weather information for your farm. You can also enter your location manually.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Manual Entry',
          onPress: () => {
            this.showManualLocationPrompt();
          },
        },
        {
          text: 'Open Settings',
          onPress: () => {
            // On iOS, this would open settings
            // On Android, the user needs to manually go to settings
            console.log('Open app settings');
          },
        },
      ]
    );
  }

  /**
   * Show manual location entry prompt
   */
  showManualLocationPrompt(): void {
    Alert.prompt(
      'Enter Location',
      'Enter your city name (e.g., "New York" or "London,UK"):',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Set Location',
          onPress: (cityName) => {
            if (cityName && cityName.trim()) {
              this.setManualLocationByCity(cityName.trim());
              Alert.alert('Success', `Location set to: ${cityName.trim()}`);
            }
          },
        },
      ],
      'plain-text'
    );
  }

  /**
   * Show coordinate entry prompt
   */
  showCoordinatePrompt(): void {
    Alert.alert(
      'Enter Coordinates',
      'Enter your coordinates manually',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Enter Latitude',
          onPress: () => {
            Alert.prompt(
              'Latitude',
              'Enter latitude (-90 to 90):',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Next',
                  onPress: (lat) => {
                    const latitude = parseFloat(lat || '');
                    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
                      Alert.alert('Error', 'Please enter a valid latitude (-90 to 90)');
                      return;
                    }
                    this.promptForLongitude(latitude);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  private promptForLongitude(latitude: number): void {
    Alert.prompt(
      'Longitude',
      'Enter longitude (-180 to 180):',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Set Location',
          onPress: (lng) => {
            const longitude = parseFloat(lng || '');
            if (isNaN(longitude) || longitude < -180 || longitude > 180) {
              Alert.alert('Error', 'Please enter a valid longitude (-180 to 180)');
              return;
            }
            this.setManualLocation({ latitude, longitude });
            Alert.alert('Success', `Location set to: ${latitude}, ${longitude}`);
          },
        },
      ]
    );
  }

  /**
   * Get default coordinates (Colombo, Sri Lanka as fallback)
   */
  getDefaultCoordinates(): LocationCoords {
    return {
      latitude: 6.9271,
      longitude: 79.8612
    };
  }
}

// Export singleton instance
export const locationService = new LocationService();
export default locationService;
