import { Loader } from '@googlemaps/js-api-loader';
import config from './config';

const { googleMapsApiKey } = config;

if (!googleMapsApiKey) {
  throw new Error('Google Maps API key is missing. Please check your .env file and ensure VITE_GOOGLE_MAPS_API_KEY is set.');
}

const loader = new Loader({
  apiKey: googleMapsApiKey,
  version: 'weekly',
  libraries: ['places']
});

let loadPromise: Promise<typeof google> | null = null;

export const loadGoogleMaps = (): Promise<typeof google> => {
  if (!loadPromise) {
    loadPromise = loader.load();
  }
  return loadPromise;
};

export { loader };
