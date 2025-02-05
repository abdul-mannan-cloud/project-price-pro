
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "Language Settings": "Language Settings",
      "Choose your preferred language": "Choose your preferred language",
      "This will be the default language used throughout the application": "This will be the default language used throughout the application",
      "Preferred Language": "Preferred Language",
      "Language updated": "Language updated",
      "Your language preference has been saved.": "Your language preference has been saved.",
      "Error": "Error",
      "Failed to update language preference.": "Failed to update language preference.",
      "Loading language preferences...": "Loading language preferences...",
      "Choose your preferred language. This will be used across the entire application.": "Choose your preferred language. This will be used across the entire application."
    }
  },
  es: {
    translation: {
      "Language Settings": "Configuración de idioma",
      "Choose your preferred language": "Elige tu idioma preferido",
      "This will be the default language used throughout the application": "Este será el idioma predeterminado utilizado en toda la aplicación",
      "Preferred Language": "Idioma preferido",
      "Language updated": "Idioma actualizado",
      "Your language preference has been saved.": "Tu preferencia de idioma ha sido guardada.",
      "Error": "Error",
      "Failed to update language preference.": "No se pudo actualizar la preferencia de idioma.",
      "Loading language preferences...": "Cargando preferencias de idioma...",
      "Choose your preferred language. This will be used across the entire application.": "Elige tu idioma preferido. Se utilizará en toda la aplicación."
    }
  },
  fr: {
    translation: {
      "Language Settings": "Paramètres de langue",
      "Choose your preferred language": "Choisissez votre langue préférée",
      "This will be the default language used throughout the application": "Ce sera la langue par défaut utilisée dans toute l'application",
      "Preferred Language": "Langue préférée",
      "Language updated": "Langue mise à jour",
      "Your language preference has been saved.": "Vos préférences de langue ont été enregistrées.",
      "Error": "Erreur",
      "Failed to update language preference.": "Impossible de mettre à jour les préférences de langue.",
      "Loading language preferences...": "Chargement des préférences de langue...",
      "Choose your preferred language. This will be used across the entire application.": "Choisissez votre langue préférée. Elle sera utilisée dans toute l'application."
    }
  }
};

const i18n = i18next.createInstance();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
