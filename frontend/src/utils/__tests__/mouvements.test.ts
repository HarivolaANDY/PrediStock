/**
 * Annulations de mouvements de stock (src/utils/mouvements.ts).
 * Un achat/une vente annulé(e) laisse un mouvement d'origine (`annule_par` renseigné) et un
 * mouvement d'annulation (`annule` renseigné) : ils s'affichent, mais ne comptent pas dans les flux.
 */
import { describe, expect, it } from "vitest";
import {
  estAnnulation, estAnnule, estEffectif, natureMouvement, statsMouvementsParProduit,
} from "@/utils/mouvements";

describe("Repérage des mouvements d'annulation", () => {
  it("un mouvement ordinaire n'est ni annulé ni une annulation, et il est effectif", () => {
    const m = { movement_type: "IN" };
    expect([estAnnulation(m), estAnnule(m), estEffectif(m)]).toEqual([false, false, true]);
  });

  it("le mouvement d'origine annulé porte `annule_par`", () => {
    const m = { movement_type: "IN", annule_par: 11 };
    expect([estAnnulation(m), estAnnule(m), estEffectif(m)]).toEqual([false, true, false]);
  });

  it("le mouvement d'annulation porte `annule`", () => {
    const m = { movement_type: "OUT", annule: 10 };
    expect([estAnnulation(m), estAnnule(m), estEffectif(m)]).toEqual([true, false, false]);
  });

  it("null et undefined signifient « pas de lien » (anciens enregistrements)", () => {
    expect(estEffectif({ movement_type: "IN", annule: null, annule_par: null })).toBe(true);
    expect(estEffectif({ movement_type: "IN" })).toBe(true);
  });

  it("l'id 0 compte comme un lien (on teste null, pas la valeur « falsy »)", () => {
    expect(estAnnulation({ annule: 0 })).toBe(true);
    expect(estAnnule({ annule_par: 0 })).toBe(true);
  });
});

describe("Nature de la transaction (achat / vente)", () => {
  it.each([
    ["IN", {}, "achat"],
    ["OUT", {}, "vente"],
    ["OUT", { annule: 1 }, "achat"], // l'inverse d'un achat est une SORTIE de stock
    ["IN", { annule: 1 }, "vente"], // l'inverse d'une vente est une ENTRÉE de stock
    ["IN", { annule_par: 2 }, "achat"], // l'original annulé garde sa nature
    ["OUT", { annule_par: 2 }, "vente"],
  ] as const)("%s %j → %s", (type, lien, attendu) => {
    expect(natureMouvement({ movement_type: type, ...lien })).toBe(attendu);
  });

  it("les autres types (ajustement, retour, rebut…) n'ont pas de nature achat/vente", () => {
    for (const type of ["ADJUSTMENT", "RETURN", "SCRAP", "ALLOCATION", undefined, null]) {
      expect(natureMouvement({ movement_type: type })).toBeNull();
    }
  });
});

describe("Statistiques par produit", () => {
  const mvt = (over: object) => ({ produit: 1, quantity: 1, timestamp: "2025-03-10T10:00:00Z", movement_type: "IN", ...over });

  it("additionne entrées et sorties réelles (RETURN compte en entrée, SCRAP en sortie)", () => {
    const stats = statsMouvementsParProduit([
      mvt({ movement_type: "IN", quantity: 10 }),
      mvt({ movement_type: "RETURN", quantity: 2 }),
      mvt({ movement_type: "OUT", quantity: 3 }),
      mvt({ movement_type: "SCRAP", quantity: 1 }),
      mvt({ movement_type: "ADJUSTMENT", quantity: 50 }), // ni entrée ni sortie
    ]);
    expect(stats[1]).toMatchObject({ nbEntree: 12, nbSortie: 4 });
  });

  it("un achat annulé ne gonfle ni les entrées ni les sorties", () => {
    const stats = statsMouvementsParProduit([
      mvt({ id: 10, movement_type: "IN", quantity: 5, annule_par: 11, timestamp: "2025-03-11T10:00:00Z" }),
      mvt({ id: 11, movement_type: "OUT", quantity: 5, annule: 10, timestamp: "2025-03-12T10:00:00Z" }),
      mvt({ movement_type: "IN", quantity: 4, timestamp: "2025-03-01T10:00:00Z" }),
    ]);
    expect(stats[1]).toMatchObject({ nbEntree: 4, nbSortie: 0 });
  });

  it("le dernier mouvement tient compte des annulations (c'est le dernier événement physique)", () => {
    const stats = statsMouvementsParProduit([
      mvt({ movement_type: "IN", annule_par: 11, timestamp: "2025-03-11T10:00:00Z" }),
      mvt({ movement_type: "OUT", annule: 10, timestamp: "2025-03-12T10:00:00Z" }),
    ]);
    expect(stats[1]).toMatchObject({ dernierMvt: "OUT", dateDernierMvt: "2025-03-12T10:00:00Z", nbEntree: 0, nbSortie: 0 });
  });

  it("l'ordre des mouvements en entrée n'a pas d'importance pour le dernier mouvement", () => {
    const ancien = mvt({ movement_type: "IN", timestamp: "2025-01-01T00:00:00Z" });
    const recent = mvt({ movement_type: "OUT", timestamp: "2025-06-01T00:00:00Z" });
    expect(statsMouvementsParProduit([recent, ancien])[1].dernierMvt).toBe("OUT");
    expect(statsMouvementsParProduit([ancien, recent])[1].dernierMvt).toBe("OUT");
  });

  it("sépare les produits et résout l'id par `produit`, `product` ou `product_details`", () => {
    const stats = statsMouvementsParProduit([
      mvt({ produit: 1, quantity: 1 }),
      { movement_type: "IN", quantity: 2, timestamp: "t", product: 2 },
      { movement_type: "IN", quantity: 3, timestamp: "t", product_details: { id: 3 } },
    ]);
    expect(Object.keys(stats).sort()).toEqual(["1", "2", "3"]);
    expect([stats[1].nbEntree, stats[2].nbEntree, stats[3].nbEntree]).toEqual([1, 2, 3]);
  });

  it("ignore un mouvement sans produit et tolère les quantités en chaîne ou invalides", () => {
    const stats = statsMouvementsParProduit([
      { movement_type: "IN", quantity: 5, timestamp: "t" },
      mvt({ quantity: "7.5" }),
      mvt({ quantity: "abc" }),
    ]);
    expect(Object.keys(stats)).toEqual(["1"]);
    expect(stats[1].nbEntree).toBe(7.5);
  });

  it("sans mouvement : aucun produit", () => {
    expect(statsMouvementsParProduit([])).toEqual({});
  });
});
