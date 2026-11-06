import { screen, within } from "@testing-library/react";

/** Normalise tous les types d'espaces (dont U+202F produit par Intl fr-MG). */
export const norm = (s: string | null | undefined) =>
  (s ?? "").replace(/\s+/g, " ").trim();

/** Matcher texte : élément feuille dont le texte normalisé vaut `text` (ex. "100 000 Ar"). */
export const hasText =
  (text: string) =>
  (_content: string, el: Element | null): boolean =>
    !!el && el.children.length === 0 && norm(el.textContent) === text;

/** Carte KPI (div.rounded-2xl) contenant le libellé donné. */
export function kpiCard(label: string): HTMLElement {
  const el = screen.getByText(label).closest(".rounded-2xl");
  if (!el) throw new Error(`Carte KPI introuvable : ${label}`);
  return el as HTMLElement;
}

/** Ligne de tableau contenant le texte donné. */
export function rowOf(text: string): HTMLElement {
  const el = screen.getByText(text).closest("tr");
  if (!el) throw new Error(`Ligne introuvable : ${text}`);
  return el as HTMLElement;
}

/** Champ (input/select) situé dans le même bloc que son libellé. */
export function fieldByLabel(root: HTMLElement, label: string): HTMLInputElement | HTMLSelectElement {
  const lab = within(root).getAllByText(label)[0];
  const field = lab.parentElement?.querySelector("input, select");
  if (!field) throw new Error(`Champ introuvable pour le libellé : ${label}`);
  return field as HTMLInputElement | HTMLSelectElement;
}

/** Tous les champs (input/select) associés à des libellés identiques (ex. une ligne d'article par libellé). */
export function fieldsByLabel(root: HTMLElement, label: string): Array<HTMLInputElement | HTMLSelectElement> {
  return within(root)
    .getAllByText(label)
    .map((lab) => lab.parentElement?.querySelector("input, select"))
    .filter(Boolean) as Array<HTMLInputElement | HTMLSelectElement>;
}
