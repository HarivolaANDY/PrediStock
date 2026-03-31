interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // Ajoutez d'autres variables d'environnement si nécessaire
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}