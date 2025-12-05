import { promises as fs } from 'fs';
import path from 'path';

export async function useTranslation(lng: string, ns: string = 'common') {
  // Simple server-side translation function
  const t = async (key: string, defaultValue?: string) => {
    try {
      // Load the translation file from the server
      const filePath = path.join(process.cwd(), 'public/locales', lng, `${ns}.json`);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const translations = JSON.parse(fileContent);
      
      // Split the key by dots to access nested objects
      const parts = key.split('.');
      let value = translations;
      
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          // If we can't find the key in our translations, return the default or the key itself
          return defaultValue || key;
        }
      }
      
      return typeof value === 'string' ? value : defaultValue || key;
    } catch { // Removed unused 'error' variable
      // Return default value or key if the translation file can't be loaded
      console.warn(`Translation failed for key "${key}" in ${lng}/${ns}. Falling back.`); // Added a warning
      return defaultValue || key;
    }
  };
  
  // Mock i18n instance
  const i18n = { 
    language: lng,
    resolvedLanguage: lng
  };
  
  return {
    t,
    i18n
  };
}
