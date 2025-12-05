'use client';

// Import locale files statically
import enCommon from '@/public/locales/en/common.json';
import jaCommon from '@/public/locales/ja/common.json';

// Define locale data structure
const localeData = {
  en: {
    common: enCommon
  },
  ja: {
    common: jaCommon
  }
} as const;

// Simplified client translation hook for Next.js App Router
export function useTranslation(lng: string, ns: string = 'common') {
  // Define a type for translation options for clarity
  type TranslationOptions = Record<string, unknown>;
  
  type TranslateFunction = {
    (key: string, defaultValue?: string): string;
    (key: string, options: { returnObjects: true }): unknown[]; // Use unknown[] instead of any[]
    (key: string, defaultValue: string, options: { returnObjects: true }): unknown[]; // Use unknown[] instead of any[]
    (key: string, options: TranslationOptions): string; // Use TranslationOptions
    (key: string, defaultValue: string, options: TranslationOptions): string; // Use TranslationOptions
  };
  
  const translate = ((key: string, defaultValueOrOptions?: string | TranslationOptions, options?: TranslationOptions) => { // Use TranslationOptions
    // Handle options as second or third parameter
    let defaultValue: string | undefined;
    let opts: TranslationOptions | undefined; // Use TranslationOptions
    
    if (typeof defaultValueOrOptions === 'string') {
      defaultValue = defaultValueOrOptions;
      opts = options; // Type is already TranslationOptions | undefined from parameter
    } else {
      defaultValue = undefined;
      opts = defaultValueOrOptions; // Type is already TranslationOptions | undefined from parameter
    }
    
    const returnObjects = opts?.returnObjects === true;
    
    try {
      // Get translations from statically imported data
      const validLng = lng in localeData ? lng as keyof typeof localeData : 'en';
      const validNs = ns in localeData[validLng] ? ns as keyof typeof localeData[typeof validLng] : 'common';
      
      const translations = localeData[validLng][validNs];
      
      // Split the key by dots to access nested objects
      const parts = key.split('.');
      // Use unknown for safer type handling
      let value: unknown = translations; 
      
      for (const part of parts) {
        // Check if value is a non-null object before accessing property
        if (value && typeof value === 'object' && part in value) {
          // Type assertion needed here because `part in value` implies value[part] exists
          value = (value as Record<string, unknown>)[part]; 
        } else {
          // If key path doesn't exist, return default or key
          return returnObjects ? [] : (defaultValue ?? key); // Use nullish coalescing
        }
      }
      
      // Check if the final value is an array when returnObjects is true
      if (returnObjects && Array.isArray(value)) {
        return value; // Return the array (type unknown[])
      }
      
      // Otherwise, return the string value or default/key
      return typeof value === 'string' ? value : (defaultValue ?? key); // Use nullish coalescing
    } catch (error) { // Remove unused 'error' variable
      // Return default value or key if the translation file can't be loaded or other error occurs
      console.warn(`Translation failed for key "${key}" in ${lng}/${ns}. Falling back.`, error);
      return returnObjects ? [] : (defaultValue ?? key); // Use nullish coalescing
    }
  }) as TranslateFunction;
  
  // Mock i18n instance
  const i18n = { 
    language: lng,
    changeLanguage: () => Promise.resolve()
  };
  
  return { t: translate, i18n };
}
