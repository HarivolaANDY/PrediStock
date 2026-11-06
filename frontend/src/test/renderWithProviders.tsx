import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** QueryClient de test : pas de retry ni de cache entre les tests. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(ui: ReactElement, client = createTestQueryClient()) {
  return {
    queryClient: client,
    ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>),
  };
}

/** Simule un utilisateur connecté (le module lit `localStorage.user`). */
export function loginAs(user: { id: number; username?: string } = { id: 1, username: "andy" }) {
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("token", "test-token");
}
