import { API_BASE_URL, getAuthHeaders } from "@/config/api.config";

export const API_URL = `${API_BASE_URL}/catalogue/products/`;

interface ProductApiResponse {
  status: string;
  message?: string;
  data?: unknown;
}

/** Retourne uniquement le header Authorization, sans Content-Type */
function getAuthOnlyHeader(): Record<string, string> {
  const all = getAuthHeaders() as Record<string, string>;
  const { "Content-Type": _removed, ...rest } = all;
  return rest;
}

/**
 * Upload une seule image pour un produit via /upload_image/
 * Retourne true si succès, false sinon
 */
async function uploadSingleImage(productId: number, file: File): Promise<boolean> {
  const imgForm = new FormData();
  imgForm.append("product_img", file);

  const response = await fetch(`${API_URL}${productId}/upload_image/`, {
    method: "POST",
    headers: getAuthOnlyHeader(), // ← pas de Content-Type, navigateur gère le boundary
    body: imgForm,
  });

  if (!response.ok) {
    const err = await response.text();
    console.warn(`⚠️ Échec upload image "${file.name}":`, err);
    return false;
  }
  console.log(`✅ Image "${file.name}" uploadée`);
  return true;
}

export async function saveProduct(
  data: FormData | Record<string, unknown>,
  token?: string
) {
  const authHeader = token
    ? { Authorization: `Token ${token}` }
    : getAuthHeaders();

  // ── Extraire id, images et champs scalaires du FormData ──────────────────
  let id: string | null = null;
  const imageFiles: File[] = [];
  const jsonData: Record<string, unknown> = {};

  if (data instanceof FormData) {
    data.forEach((value, key) => {
      if (key === "product_img") {
        // FormData peut contenir plusieurs entrées "product_img"
        if (value instanceof File) imageFiles.push(value);
        return;
      }
      if (key === "id") { id = value as string; return; }

      if (key === "price")
        jsonData[key] = parseFloat(value as string);
      else if (["stock_threshold", "current_stock"].includes(key))
        jsonData[key] = parseInt(value as string, 10);
      else if (["category", "supplier"].includes(key))
        jsonData[key] = value ? parseInt(value as string, 10) : null;
      else if (["is_active", "est_perissable"].includes(key))
        jsonData[key] = value === "true";
      else
        jsonData[key] = value;
    });
  } else {
    Object.assign(jsonData, data);
    id = (data.id as string) ?? null;
  }

  const method = id ? "PATCH" : "POST";
  const url    = id ? `${API_URL}${id}/` : API_URL;

  const payload = {
    name:            jsonData.name            ?? "",
    description:     jsonData.description     ?? "",
    price:           jsonData.price           ?? 0,
    stock_threshold: jsonData.stock_threshold ?? 0,
    current_stock:   jsonData.current_stock   ?? 0,
    sku:             jsonData.sku             ?? "",
    is_active:       true,
    category:        jsonData.category        ?? null,
    supplier:        jsonData.supplier        ?? null,
    est_perissable:  jsonData.est_perissable  ?? false,
    unite_mesure:    jsonData.unite_mesure    ?? "pc",
  };

  console.log("📦 [JSON] Payload produit:", JSON.stringify(payload, null, 2));

  // ── Étape 1 : créer/modifier le produit en JSON ───────────────────────────
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("❌ Réponse backend (JSON):", errorBody);
    throw new Error(errorBody);
  }

  const result = (await response.json()) as ProductApiResponse;
  if (result.status === "error") {
    throw new Error(result.message || "Erreur lors de l'enregistrement");
  }

  const savedProduct = result.data as { id?: number } | undefined;
  const productId = savedProduct?.id ?? (id ? parseInt(id) : null);

  // ── Étape 2 : upload de TOUTES les images en séquence ────────────────────
  // ── Étape 2 : upload de TOUTES les images en séquence ────────────────────
  if (imageFiles.length > 0 && productId) {
    console.log(`🖼️ Upload de ${imageFiles.length} image(s) pour produit #${productId}...`);

    // ✅ Si c'est une modification, supprimer les anciennes images d'abord
    if (id) {
      await fetch(`${API_URL}${productId}/remove_image/`, {
        method: "DELETE",
        headers: authHeader as Record<string, string>,
      }).catch(() => {}); // silencieux si pas d'image principale
    }

    const results = []
    for (const file of imageFiles) {
      const ok = await uploadSingleImage(productId, file)
      results.push(ok)
    }

    const succeeded = results.filter((r) => r.status === "fulfilled" && r.value).length;
    const failed    = results.length - succeeded;

    if (failed > 0) {
      console.warn(`⚠️ ${failed} image(s) non uploadée(s), ${succeeded} réussie(s)`);
    } else {
      console.log(`✅ Toutes les images uploadées (${succeeded}/${imageFiles.length})`);
    }
  }

  return savedProduct;
}