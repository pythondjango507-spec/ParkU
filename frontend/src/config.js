import { Platform, NativeModules } from 'react-native';

const getInitialApiUrl = () => {
  // Automatically detect the PC's Wi-Fi / host IP from Expo Metro bundler
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/https?:\/\/([^:/]+)/);
      if (match && match[1]) {
        const host = match[1];
        if (host !== 'localhost' && host !== '127.0.0.1' && host !== '10.0.2.2') {
          return `http://${host}:8000`;
        }
      }
    }
  } catch (e) {
    // ignore fallback
  }

  // Primary Wi-Fi LAN IP of your laptop
  return 'http://192.168.1.7:8000';
};

export const DEFAULT_API_URL = getInitialApiUrl();

let currentApiUrl = DEFAULT_API_URL;

export const getApiUrl = () => currentApiUrl;

export const setApiUrl = (newUrl) => {
  currentApiUrl = newUrl.trim().replace(/\/+$/, '');
  return currentApiUrl;
};
