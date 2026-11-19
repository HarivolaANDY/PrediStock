/**
 * Saisie d'un versement sur un achat ou une vente (src/components/achat-vente/PaiementDialog.tsx).
 * Règles : montant > 0 et ≤ reste à payer, pré-rempli avec le solde, mode de paiement par défaut
 * celui du document, formulaire propre à chaque ouverture.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaiementDialog } from "@/components/achat-vente/PaiementDialog";

function monter(over: Partial<React.ComponentProps<typeof PaiementDialog>> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    titre: "Enregistrer un paiement",
    reference: "BC-001",
    total: 10000,
    dejaPaye: 4000,
    modeParDefaut: "Virement",
    onSubmit: vi.fn(),
    ...over,
  };
  const rendu = render(<PaiementDialog {...props} />);
  return { ...props, ...rendu };
}

const champMontant = () => screen.getByLabelText(/Montant versé/) as HTMLInputElement;
const champMode = () => screen.getByLabelText("Mode de paiement") as HTMLSelectElement;
const valider = () => screen.getByRole("button", { name: "Enregistrer le paiement" });
const normaliser = (s: string | null) => (s ?? "").replace(/\s+/g, " ");

describe("PaiementDialog — affichage", () => {
  it("rappelle la référence, le total, ce qui est déjà payé et le reste à payer", () => {
    monter();
    const dialogue = screen.getByRole("dialog");
    expect(normaliser(dialogue.textContent)).toContain("BC-001 — total 10 000 Ar, déjà payé 4 000 Ar");
    expect(normaliser(screen.getByText("Reste à payer").nextElementSibling!.textContent)).toBe("6 000 Ar");
  });

  it("pré-remplit le montant avec le reste à payer et le mode avec celui du document", () => {
    monter();
    expect(champMontant().value).toBe("6000");
    expect(champMode().value).toBe("Virement");
  });

  it("retombe sur « Espèces » si le mode du document n'est pas proposé", () => {
    monter({ modeParDefaut: "Troc" });
    expect(champMode().value).toBe("Espèces");
  });

  it("n'affiche rien quand la fenêtre est fermée", () => {
    monter({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("PaiementDialog — validation du montant", () => {
  it("accepte un montant partiel", async () => {
    monter();
    fireEvent.change(champMontant(), { target: { value: "2500" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(valider()).toBeEnabled();
  });

  it("accepte exactement le reste à payer", () => {
    monter();
    fireEvent.change(champMontant(), { target: { value: "6000" } });
    expect(valider()).toBeEnabled();
  });

  it("refuse un montant supérieur au reste à payer et le dit", () => {
    monter();
    fireEvent.change(champMontant(), { target: { value: "6001" } });
    expect(normaliser(screen.getByRole("alert").textContent)).toContain("dépasse le reste à payer (6 000 Ar)");
    expect(valider()).toBeDisabled();
  });

  it.each(["0", "-5"])("refuse le montant %s", (valeur) => {
    monter();
    fireEvent.change(champMontant(), { target: { value: valeur } });
    expect(screen.getByRole("alert")).toHaveTextContent("supérieur à 0");
    expect(valider()).toBeDisabled();
  });

  it("désactive la validation tant que le montant est vide, sans message d'erreur", async () => {
    monter();
    await userEvent.clear(champMontant());
    expect(valider()).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("« Solder » remplit le reste à payer", async () => {
    monter();
    fireEvent.change(champMontant(), { target: { value: "100" } });
    await userEvent.click(screen.getByRole("button", { name: "Solder" }));
    expect(champMontant().value).toBe("6000");
  });

  it("document déjà soldé : rien à saisir ni à valider", () => {
    monter({ total: 10000, dejaPaye: 10000 });
    expect(champMontant().value).toBe("");
    expect(screen.getByRole("button", { name: "Solder" })).toBeDisabled();
    expect(valider()).toBeDisabled();
  });
});

describe("PaiementDialog — soumission", () => {
  it("envoie montant, mode et note (nettoyée)", async () => {
    const { onSubmit } = monter();
    fireEvent.change(champMontant(), { target: { value: "2500" } });
    await userEvent.selectOptions(champMode(), "Orange Money");
    await userEvent.type(screen.getByLabelText(/Note/), "  Acompte  ");
    await userEvent.click(valider());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ montant: 2500, mode_paiement: "Orange Money", notes: "Acompte" });
  });

  it("n'envoie pas de note quand elle est vide", async () => {
    const { onSubmit } = monter();
    await userEvent.click(valider());
    expect(onSubmit).toHaveBeenCalledWith({ montant: 6000, mode_paiement: "Virement", notes: undefined });
  });

  it("ne soumet pas un montant invalide (même par la touche Entrée)", async () => {
    const { onSubmit } = monter();
    fireEvent.change(champMontant(), { target: { value: "99999" } });
    fireEvent.submit(champMontant().closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("désactive la validation pendant l'enregistrement", () => {
    monter({ enCours: true });
    const boutonDeValidation = screen.getAllByRole("button").find((b) => b.getAttribute("type") === "submit")!;
    expect(boutonDeValidation).toBeDisabled();
  });

  it("« Annuler » demande la fermeture sans rien envoyer", async () => {
    const { onSubmit, onOpenChange } = monter();
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("chaque ouverture repart d'un formulaire propre", async () => {
    const props = {
      onOpenChange: vi.fn(), titre: "T", reference: "BC-001", total: 10000, dejaPaye: 0, modeParDefaut: "Espèces", onSubmit: vi.fn(),
    };
    const { rerender } = render(<PaiementDialog {...props} open />);
    fireEvent.change(champMontant(), { target: { value: "123" } });
    await userEvent.type(screen.getByLabelText(/Note/), "brouillon");

    rerender(<PaiementDialog {...props} open={false} />);
    rerender(<PaiementDialog {...props} open />);

    expect(champMontant().value).toBe("10000");
    expect((screen.getByLabelText(/Note/) as HTMLInputElement).value).toBe("");
  });
});
