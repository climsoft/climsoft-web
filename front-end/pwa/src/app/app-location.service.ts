import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AppLocationService {

   public getUserLocation(): Observable<{ latitude: number, longitude: number }> {
        return new Observable(observer => {
            if (!('geolocation' in navigator)) {
                observer.error('Geolocation is not supported by your browser.');
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('Position: ', position);

                    observer.next({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                    observer.complete();
                },
                (error) => {
                    observer.error(this.getGeolocationError(error));
                }
            );
        });
    }

    private getGeolocationError(error: GeolocationPositionError): string {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return 'User denied the request for Geolocation.';
            case error.POSITION_UNAVAILABLE:
                return 'Location information is unavailable.';
            case error.TIMEOUT:
                return 'The request to get user location timed out.';
            default:
                return 'An unknown error occurred.';
        }
    }
}
