import i18n from "i18next"
import { initReactI18next } from "react-i18next"

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          welcome: "Welcome to my app",
          logout: "Logout"
        }
      },
      fr: {
        translation: {
          welcome: "Bienvenue sur mon application",
          logout: "Se déconnecter"
        }
      },
      es: {
        translation: {
          welcome: "Bienvenido a mi aplicación",
          logout: "Cerrar sesión"
        }
      },
      de: {
        translation: {
          welcome: "Willkommen in meiner Anwendung",
          logout: "Abmelden"
        }
      }
    },
    lng: "fr",            
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false
    }
  })

export default i18n