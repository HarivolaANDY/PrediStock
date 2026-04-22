import type { AxiosResponse, AxiosRequestConfig } from 'axios';
import API from "@/services/axios";

export interface BlobParseResult {
	files: { blob: Blob; filename: string }[];
	json?: unknown;
	text?: string;
}

export interface AxiosBlobResponse {
	headers?: Record<string, string | string[]>;
	data: Blob | string;
}

/**
 * Helper to get a string value from headers that may contain string arrays
 */
function getHeaderString(headers: Record<string, string | string[]>, key: string): string {
	const value = headers[key] || headers[key.toLowerCase()] || '';
	return Array.isArray(value) ? value[0] : value;
}

export async function parseAxiosBlobResponse(res: AxiosBlobResponse, titre = "report.pdf"): Promise<BlobParseResult> {
	const headers = res.headers || {};
	const contentType = getHeaderString(headers, 'content-type');
	const contentDisp = getHeaderString(headers, 'content-disposition');
	const files: { blob: Blob; filename: string }[] = [];

	// Si le serveur annonce JSON (même si responseType: 'blob')
	if (contentType.includes('application/json')) {
		const text = typeof res.data === 'string' ? res.data : await (res.data as Blob).text();
		try {
			return { files, json: JSON.parse(text) };
		} catch {
			return { files, text };
		}
	}

	// Détection de fichier (pdf / octet-stream / attachment)
	if (
		contentType.includes('application/pdf') ||
		contentType.includes('application/octet-stream') ||
		/attachment/i.test(contentDisp)
	) {
		let filename = 'download';
		const match = /filename\*=UTF-8''(.+)$/.exec(contentDisp) || /filename="?([^"]+)"?/.exec(contentDisp);
		if (match && match[1]) {
			filename = decodeURIComponent(match[1]);
		} else if (contentType.includes('pdf')) {
			filename = titre;
		} else {
			filename = 'file.bin';
		}

		const blob = res.data instanceof Blob ? res.data : new Blob([res.data as string], { type: contentType || 'application/octet-stream' });
		files.push({ blob, filename });
		return { files };
	}

	// Fallback : tenter de lire texte et JSON
	try {
		const text = typeof res.data === 'string' ? res.data : await (res.data as Blob).text();
		try {
			return { files, json: JSON.parse(text) };
		} catch {
			return { files, text };
		}
	} catch {
		return { files };
	}
}

export function downloadBlob(blob: Blob, filename: string) {
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.setAttribute('download', filename);
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.URL.revokeObjectURL(url);
}

export function downloadAll(files: { blob: Blob; filename: string }[]) {
	files.forEach(({ blob, filename }) => downloadBlob(blob, filename));
}

/**
 * Parsea une réponse Axios (responseType: 'blob') et télécharge immédiatement
 * tous les fichiers détectés. Retourne l'objet parsé pour inspection.
 */
export async function downloadFromAxiosResponse(res: AxiosBlobResponse): Promise<BlobParseResult> {
	const parsed = await parseAxiosBlobResponse(res);

	if (parsed.files && parsed.files.length) {
		// Téléchargement immédiat de tous les fichiers reçus
		for (const f of parsed.files) {
			downloadBlob(f.blob, f.filename);
		}
	}

	return parsed;
}

/**
 * Effectue un appel HTTP via l'API du projet et télécharge immédiatement
 * tout fichier retourné (PDF / attachment). Méthode 'get' ou 'post'.
 *
 * Usage :
 *   await fetchAndDownload('/produits_dv/entree/', 'post', payload);
 */
export async function fetchAndDownload(
	url: string,
	method: 'get' | 'post' = 'get',
	data?: unknown,
	config: AxiosRequestConfig = {}
): Promise<BlobParseResult> {
	const cfg: AxiosRequestConfig = { ...config, responseType: 'blob' };
	let res: AxiosResponse;
	if (method === 'post') {
		res = await API.post(url, data, cfg);
	} else {
		// pour GET on passe data en params
		res = await API.get(url, { ...cfg, params: data });
	}
	return await downloadFromAxiosResponse(res as AxiosBlobResponse);
}

// Nouvelle fonction utilitaire centrée sur le téléchargement immédiat d'un PDF via une URL API.
// Usage depuis un composant TSX : await downloadPdf('/api/pdf/download_pdf/', 'get', { report_id: 123 })
export async function downloadPdf(
	url: string,
	method: 'get' | 'post' = 'get',
	data?: unknown,
	config: AxiosRequestConfig = {}
): Promise<BlobParseResult> {
	// fetchAndDownload utilisera responseType: 'blob' et déclenchera le téléchargement si un fichier est reçu
	const parsed = await fetchAndDownload(url, method, data, config);
	// parsed.files a déjà été téléchargé par downloadFromAxiosResponse via fetchAndDownload
	return parsed;
}