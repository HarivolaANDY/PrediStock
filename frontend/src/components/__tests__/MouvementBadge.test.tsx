/** Badge du type d'un mouvement de stock (src/components/MouvementBadge.tsx). */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MouvementBadge } from "@/components/MouvementBadge";
import { libelleMouvement } from "@/utils/mouvements";

describe("libelleMouvement", () => {
  it("traduit les types connus", () => {
    expect(["IN", "OUT", "ADJUSTMENT", "RETURN", "SCRAP"].map(libelleMouvement)).toEqual(
      ["Entrée", "Sortie", "Ajustement", "Retour", "Rebut"],
    );
  });

  it("conserve un type inconnu tel quel et affiche « — » quand il est absent", () => {
    expect(libelleMouvement("ALLOCATION")).toBe("ALLOCATION");
    expect(libelleMouvement(null)).toBe("—");
    expect(libelleMouvement(undefined)).toBe("—");
  });
});

describe("MouvementBadge", () => {
  it("un mouvement ordinaire s'affiche avec son type, sans marque d'annulation", () => {
    render(<MouvementBadge mouvement={{ movement_type: "IN" }} />);
    expect(screen.getByText("Entrée")).toBeInTheDocument();
    expect(screen.queryByText(/Annul/)).not.toBeInTheDocument();
  });

  it("un mouvement annulé garde son type et reçoit la marque « Annulé »", () => {
    render(<MouvementBadge mouvement={{ movement_type: "IN", annule_par: 11 }} />);
    expect(screen.getByText("Entrée")).toBeInTheDocument();
    expect(screen.getByText("Annulé")).toBeInTheDocument();
  });

  it("l'inverse d'un achat est présenté comme une annulation, pas comme une simple « Sortie »", () => {
    render(<MouvementBadge mouvement={{ movement_type: "OUT", annule: 10 }} />);
    expect(screen.getByText("Annulation · Sortie")).toBeInTheDocument();
    expect(screen.queryByText("Sortie")).not.toBeInTheDocument();
  });

  it("l'inverse d'une vente est présenté « Annulation · Entrée »", () => {
    render(<MouvementBadge mouvement={{ movement_type: "IN", annule: 12 }} />);
    expect(screen.getByText("Annulation · Entrée")).toBeInTheDocument();
  });

  it("applique la couleur demandée par la page appelante", () => {
    render(<MouvementBadge mouvement={{ movement_type: "OUT" }} variant="destructive" />);
    expect(screen.getByText("Sortie").className).toContain("destructive");
  });
});
