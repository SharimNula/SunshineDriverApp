const GOOGLE_MAPS_SCRIPT_ID = 'sunshine-driver-google-maps-web';

type GoogleMapsWindow = Window &
  typeof globalThis & {
    google?: {
      maps?: any;
    };
    __sunshineDriverGoogleMapsLoader?: Promise<any>;
  };

export function getGoogleMapsWebApiKey() {
  return process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY?.trim() ?? '';
}

export function loadGoogleMapsWebApi(apiKey: string) {
  if (!apiKey) {
    return Promise.reject(new Error('A Google Maps JavaScript API key is required.'));
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Google Maps can only be loaded in a browser.'));
  }

  const runtime = window as GoogleMapsWindow;

  if (runtime.google?.maps) {
    return Promise.resolve(runtime.google.maps);
  }

  if (runtime.__sunshineDriverGoogleMapsLoader) {
    return runtime.__sunshineDriverGoogleMapsLoader;
  }

  runtime.__sunshineDriverGoogleMapsLoader = new Promise((resolve, reject) => {
    const finish = () => {
      if (runtime.google?.maps) {
        resolve(runtime.google.maps);
        return;
      }

      runtime.__sunshineDriverGoogleMapsLoader = undefined;
      reject(new Error('Google Maps did not initialize after the script loaded.'));
    };

    const fail = () => {
      runtime.__sunshineDriverGoogleMapsLoader = undefined;
      reject(new Error('Google Maps could not be loaded.'));
    };

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', finish, { once: true });
      existingScript.addEventListener('error', fail, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', fail, { once: true });
    document.head.appendChild(script);
  });

  return runtime.__sunshineDriverGoogleMapsLoader;
}

export function escapeMapHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}