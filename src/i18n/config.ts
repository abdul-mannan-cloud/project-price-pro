import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

const resources = {
  en: {
    translation: {
      // Common UI elements
      "Continue": "Continue",
      "Back": "Back",
      "Save": "Save",
      "Cancel": "Cancel",
      "Delete": "Delete",
      "Edit": "Edit",
      "Submit": "Submit",
      "Loading": "Loading...",
      "Error": "Error",
      "Success": "Success",
      
      // Navigation
      "Dashboard": "Dashboard",
      "Leads": "Leads",
      "Settings": "Settings",
      
      // Settings sections
      "Language Settings": "Language Settings",
      "Choose your preferred language": "Choose your preferred language",
      "This will be the default language used throughout the application": "This will be the default language used throughout the application",
      "Preferred Language": "Preferred Language",
      "Language updated": "Language updated",
      "Your language preference has been saved.": "Your language preference has been saved.",
      "Failed to update language preference.": "Failed to update language preference.",
      "Loading language preferences...": "Loading language preferences...",
      "Choose your preferred language. This will be used across the entire application.": "Choose your preferred language. This will be used across the entire application.",
      
      // Buttons and actions
      "View Details": "View Details",
      "Send Email": "Send Email",
      "Export": "Export",
      "Filter": "Filter",
      "Search": "Search",
      
      // Status messages
      "Pending": "Pending",
      "Completed": "Completed",
      "In Progress": "In Progress",
      "Cancelled": "Cancelled"
    }
  },
  es: {
    translation: {
      // Common UI elements
      "Continue": "Continuar",
      "Back": "Atrás",
      "Save": "Guardar",
      "Cancel": "Cancelar",
      "Delete": "Eliminar",
      "Edit": "Editar",
      "Submit": "Enviar",
      "Loading": "Cargando...",
      "Error": "Error",
      "Success": "Éxito",
      
      // Navigation
      "Dashboard": "Panel",
      "Leads": "Clientes",
      "Settings": "Configuración",
      
      // Settings sections
      "Language Settings": "Configuración de idioma",
      "Choose your preferred language": "Elige tu idioma preferido",
      "This will be the default language used throughout the application": "Este será el idioma predeterminado utilizado en toda la aplicación",
      "Preferred Language": "Idioma preferido",
      "Language updated": "Idioma actualizado",
      "Your language preference has been saved.": "Tu preferencia de idioma ha sido guardada.",
      "Failed to update language preference.": "No se pudo actualizar la preferencia de idioma.",
      "Loading language preferences...": "Cargando preferencias de idioma...",
      "Choose your preferred language. This will be used across the entire application.": "Elige tu idioma preferido. Se utilizará en toda la aplicación.",
      
      // Buttons and actions
      "View Details": "Ver detalles",
      "Send Email": "Enviar correo",
      "Export": "Exportar",
      "Filter": "Filtrar",
      "Search": "Buscar",
      
      // Status messages
      "Pending": "Pendiente",
      "Completed": "Completado",
      "In Progress": "En progreso",
      "Cancelled": "Cancelado"
    }
  },
  fr: {
    translation: {
      // Common UI elements
      "Continue": "Continuer",
      "Back": "Retour",
      "Save": "Enregistrer",
      "Cancel": "Annuler",
      "Delete": "Supprimer",
      "Edit": "Modifier",
      "Submit": "Soumettre",
      "Loading": "Chargement...",
      "Error": "Erreur",
      "Success": "Succès",
      
      // Navigation
      "Dashboard": "Tableau de bord",
      "Leads": "Prospects",
      "Settings": "Paramètres",
      
      // Settings sections
      "Language Settings": "Paramètres de langue",
      "Choose your preferred language": "Choisissez votre langue préférée",
      "This will be the default language used throughout the application": "Ce sera la langue par défaut utilisée dans toute l'application",
      "Preferred Language": "Langue préférée",
      "Language updated": "Langue mise à jour",
      "Your language preference has been saved.": "Vos préférences de langue ont été enregistrées.",
      "Failed to update language preference.": "Impossible de mettre à jour les préférences de langue.",
      "Loading language preferences...": "Chargement des préférences de langue...",
      "Choose your preferred language. This will be used across the entire application.": "Choisissez votre langue préférée. Elle sera utilisée dans toute l'application.",
      
      // Buttons and actions
      "View Details": "Voir les détails",
      "Send Email": "Envoyer un email",
      "Export": "Exporter",
      "Filter": "Filtrer",
      "Search": "Rechercher",
      
      // Status messages
      "Pending": "En attente",
      "Completed": "Terminé",
      "In Progress": "En cours",
      "Cancelled": "Annulé"
    }
  }
};

// Initialize i18next
const i18n = i18next.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('preferred_language') || 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  },
  react: {
    useSuspense: false
  }
});

// Function to apply branding colors
const applyBrandingColors = (colors: { primary: string; secondary: string }) => {
  const root = document.documentElement;
  
  // Set primary color and its variations
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--primary-foreground', '#FFFFFF');
  
  // Convert hex to RGB for creating variations
  const primaryHex = colors.primary.replace('#', '');
  const r = parseInt(primaryHex.slice(0, 2), 16);
  const g = parseInt(primaryHex.slice(2, 4), 16);
  const b = parseInt(primaryHex.slice(4, 6), 16);
  
  // Set all primary color variations
  root.style.setProperty('--primary-100', `rgba(${r}, ${g}, ${b}, 0.1)`);
  root.style.setProperty('--primary-200', `rgba(${r}, ${g}, ${b}, 0.2)`);
  root.style.setProperty('--primary-300', `rgba(${r}, ${g}, ${b}, 0.4)`);
  root.style.setProperty('--primary-400', `rgba(${r}, ${g}, ${b}, 0.6)`);
  root.style.setProperty('--primary-500', `rgba(${r}, ${g}, ${b}, 0.8)`);
  root.style.setProperty('--primary-600', colors.primary);
  root.style.setProperty('--primary-700', `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, 1)`);
  
  // Set secondary color
  root.style.setProperty('--secondary', colors.secondary);
  root.style.setProperty('--secondary-foreground', '#1d1d1f');
};

// Function to initialize branding on login
export const initializeBranding = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: contractor } = await supabase
      .from('contractors')
      .select('branding_colors')
      .eq('id', user.id)
      .single();

    if (contractor?.branding_colors) {
      applyBrandingColors(contractor.branding_colors);
    }
  } catch (error) {
    console.error('Error initializing branding:', error);
  }
};

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    initializeBranding();
  }
});

export { applyBrandingColors };
export default i18n;