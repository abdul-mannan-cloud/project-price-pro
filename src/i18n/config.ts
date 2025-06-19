import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

const resources = {
  en: {
    translation: {
      // Common UI elements
      Continue: "Continue",
      Back: "Back",
      Save: "Save",
      Cancel: "Cancel",
      Delete: "Delete",
      Edit: "Edit",
      Submit: "Submit",
      Loading: "Loading...",
      Error: "Error",
      Success: "Success",

      // Navigation & Headers
      Dashboard: "Dashboard",
      Leads: "Leads",
      Settings: "Settings",
      Estimates: "Estimates",
      Profile: "Profile",
      Team: "Team",
      Billing: "Billing",

      // Settings sections
      "Language Settings": "Language Settings",
      "Choose your preferred language": "Choose your preferred language",
      "This will be the default language used throughout the application":
        "This will be the default language used throughout the application",
      "Preferred Language": "Preferred Language",
      "Language updated": "Language updated",
      "Your language preference has been saved.":
        "Your language preference has been saved.",
      "Failed to update language preference.":
        "Failed to update language preference.",
      "Loading language preferences...": "Loading language preferences...",

      // Estimate Form
      "Project Description": "Project Description",
      "Tell us about your project": "Tell us about your project",
      "Upload Photos": "Upload Photos",
      "Add photos of your project": "Add photos of your project",
      "Select Category": "Select Category",
      "Choose project type": "Choose project type",
      "Contact Information": "Contact Information",
      "Your Details": "Your Details",
      "Review Estimate": "Review Estimate",

      // Lead Management
      "New Lead": "New Lead",
      "Lead Details": "Lead Details",
      "Customer Information": "Customer Information",
      "Project Status": "Project Status",
      "Estimated Cost": "Estimated Cost",
      "View Details": "View Details",
      "Send Email": "Send Email",
      Export: "Export",
      Filter: "Filter",
      Search: "Search",

      // Status messages
      Pending: "Pending",
      Completed: "Completed",
      "In Progress": "In Progress",
      Cancelled: "Cancelled",

      // Form Fields
      Name: "Name",
      Email: "Email",
      Phone: "Phone",
      Address: "Address",
      Message: "Message",
      Required: "Required",
      Optional: "Optional",
    },
  },
  es: {
    translation: {
      // Common UI elements
      Continue: "Continuar",
      Back: "Atrás",
      Save: "Guardar",
      Cancel: "Cancelar",
      Delete: "Eliminar",
      Edit: "Editar",
      Submit: "Enviar",
      Loading: "Cargando...",
      Error: "Error",
      Success: "Éxito",

      // Navigation & Headers
      Dashboard: "Panel",
      Leads: "Clientes Potenciales",
      Settings: "Configuración",
      Estimates: "Presupuestos",
      Profile: "Perfil",
      Team: "Equipo",
      Billing: "Facturación",

      // Settings sections
      "Language Settings": "Configuración de Idioma",
      "Choose your preferred language": "Elige tu idioma preferido",
      "This will be the default language used throughout the application":
        "Este será el idioma predeterminado utilizado en toda la aplicación",
      "Preferred Language": "Idioma Preferido",
      "Language updated": "Idioma actualizado",
      "Your language preference has been saved.":
        "Tu preferencia de idioma ha sido guardada",
      "Failed to update language preference.":
        "No se pudo actualizar la preferencia de idioma",
      "Loading language preferences...": "Cargando preferencias de idioma...",

      // Estimate Form
      "Project Description": "Descripción del Proyecto",
      "Tell us about your project": "Cuéntanos sobre tu proyecto",
      "Upload Photos": "Subir Fotos",
      "Add photos of your project": "Añade fotos de tu proyecto",
      "Select Category": "Seleccionar Categoría",
      "Choose project type": "Elige el tipo de proyecto",
      "Contact Information": "Información de Contacto",
      "Your Details": "Tus Datos",
      "Review Estimate": "Revisar Presupuesto",

      // Lead Management
      "New Lead": "Nuevo Cliente Potencial",
      "Lead Details": "Detalles del Cliente",
      "Customer Information": "Información del Cliente",
      "Project Status": "Estado del Proyecto",
      "Estimated Cost": "Costo Estimado",
      "View Details": "Ver Detalles",
      "Send Email": "Enviar Correo",
      Export: "Exportar",
      Filter: "Filtrar",
      Search: "Buscar",

      // Status messages
      Pending: "Pendiente",
      Completed: "Completado",
      "In Progress": "En Proceso",
      Cancelled: "Cancelado",

      // Form Fields
      Name: "Nombre",
      Email: "Correo Electrónico",
      Phone: "Teléfono",
      Address: "Dirección",
      Message: "Mensaje",
      Required: "Requerido",
      Optional: "Opcional",
    },
  },
  fr: {
    translation: {
      // Common UI elements
      Continue: "Continuer",
      Back: "Retour",
      Save: "Enregistrer",
      Cancel: "Annuler",
      Delete: "Supprimer",
      Edit: "Modifier",
      Submit: "Soumettre",
      Loading: "Chargement...",
      Error: "Erreur",
      Success: "Succès",

      // Navigation & Headers
      Dashboard: "Tableau de Bord",
      Leads: "Prospects",
      Settings: "Paramètres",
      Estimates: "Devis",
      Profile: "Profil",
      Team: "Équipe",
      Billing: "Facturation",

      // Settings sections
      "Language Settings": "Paramètres de Langue",
      "Choose your preferred language": "Choisissez votre langue préférée",
      "This will be the default language used throughout the application":
        "Ce sera la langue par défaut utilisée dans toute l'application",
      "Preferred Language": "Langue Préférée",
      "Language updated": "Langue mise à jour",
      "Your language preference has been saved.":
        "Vos préférences de langue ont été enregistrées",
      "Failed to update language preference.":
        "Impossible de mettre à jour les préférences de langue",
      "Loading language preferences...":
        "Chargement des préférences de langue...",

      // Estimate Form
      "Project Description": "Description du Projet",
      "Tell us about your project": "Parlez-nous de votre projet",
      "Upload Photos": "Télécharger des Photos",
      "Add photos of your project": "Ajoutez des photos de votre projet",
      "Select Category": "Sélectionner une Catégorie",
      "Choose project type": "Choisissez le type de projet",
      "Contact Information": "Coordonnées",
      "Your Details": "Vos Informations",
      "Review Estimate": "Examiner le Devis",

      // Lead Management
      "New Lead": "Nouveau Prospect",
      "Lead Details": "Détails du Prospect",
      "Customer Information": "Informations Client",
      "Project Status": "État du Projet",
      "Estimated Cost": "Coût Estimé",
      "View Details": "Voir les Détails",
      "Send Email": "Envoyer un Email",
      Export: "Exporter",
      Filter: "Filtrer",
      Search: "Rechercher",

      // Status messages
      Pending: "En Attente",
      Completed: "Terminé",
      "In Progress": "En Cours",
      Cancelled: "Annulé",

      // Form Fields
      Name: "Nom",
      Email: "Email",
      Phone: "Téléphone",
      Address: "Adresse",
      Message: "Message",
      Required: "Requis",
      Optional: "Optionnel",
    },
  },
};

const i18n = i18next.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("preferred_language") || "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

// Function to apply branding colors
const applyBrandingColors = (colors: {
  primary: string;
  secondary: string;
}) => {
  const root = document.documentElement;
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--primary-foreground", "#FFFFFF");
  root.style.setProperty("--secondary", colors.secondary);
  root.style.setProperty("--secondary-foreground", "#1d1d1f");

  const primaryHex = colors.primary.replace("#", "");
  const r = parseInt(primaryHex.slice(0, 2), 16);
  const g = parseInt(primaryHex.slice(2, 4), 16);
  const b = parseInt(primaryHex.slice(4, 6), 16);

  root.style.setProperty("--primary-100", `rgba(${r}, ${g}, ${b}, 0.1)`);
  root.style.setProperty("--primary-200", `rgba(${r}, ${g}, ${b}, 0.2)`);
  root.style.setProperty("--primary-300", `rgba(${r}, ${g}, ${b}, 0.4)`);
  root.style.setProperty("--primary-400", `rgba(${r}, ${g}, ${b}, 0.6)`);
  root.style.setProperty("--primary-500", `rgba(${r}, ${g}, ${b}, 0.8)`);
  root.style.setProperty("--primary-600", colors.primary);
  root.style.setProperty(
    "--primary-700",
    `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, 1)`,
  );
};

export const initializeBranding = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: contractor } = await supabase
      .from("contractors")
      .select("branding_colors")
      .eq("user_id", user.id)
      .single();

    if (contractor?.branding_colors) {
      applyBrandingColors(
        contractor.branding_colors as { primary: string; secondary: string },
      );
    }
  } catch (error) {
    console.error("Error initializing branding:", error);
  }
};

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session?.user) {
    initializeBranding();
  }
});

export { applyBrandingColors };
export default i18next;
