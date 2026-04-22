export interface AxiosResponseWithBlob {
	headers?: Record<string, string | number | undefined> | { get?(key: string): string | number | undefined };
	data: Blob;
}

export interface ParsedBlobResponse<T = unknown> {
	files: { blob: Blob; filename: string }[];
	json?: T;
	text?: string;
}

export async function parseAxiosBlobResponse(
	res: AxiosResponseWithBlob,
	titre = "report.pdf"
): Promise<ParsedBlobResponse> {
	const headers = res.headers || {};
	// Helper to get header value (supports both Record and AxiosResponseHeaders with get method)
	const getHeader = (key: string): string => {
		const h = headers as Record<string, unknown>;
		const val = h[key];
		if (typeof val === 'string') return val;
		if (typeof val === 'number') return String(val);
		if (val === undefined && typeof (headers as { get?: (key: string) => unknown }).get === 'function') {
			const resVal = (headers as {get: (key: string) => unknown}).get(key);
			return typeof resVal === 'string' ? resVal : typeof resVal === 'number' ? String(resVal) : '';
		}
		return '';
	};
	const contentType = getHeader('content-type') || getHeader('Content-Type') || '';
	const contentDisp = getHeader('content-disposition') || getHeader('Content-Disposition') || '';
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
export async function downloadFromAxiosResponse(
	res: AxiosResponseWithBlob
): Promise<ParsedBlobResponse> {
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
	config: Record<string, unknown> = {}
): Promise<ParsedBlobResponse> {
	const cfg = { ...(config || {}), responseType: 'blob' as const };
	let res: AxiosResponseWithBlob;
	if (method === 'post') {
		res = (await API.post(url, data, cfg)) as AxiosResponseWithBlob;
	} else {
		// pour GET on passe data en params
		res = (await API.get(url, { ...cfg, params: data })) as AxiosResponseWithBlob;
	}
	return await downloadFromAxiosResponse(res as AxiosBlobResponse);
}

// Nouvelle fonction utilitaire centrée sur le téléchargement immédiat d'un PDF via une URL API.
// Usage depuis un composant TSX : await downloadPdf('/api/pdf/download_pdf/', 'get', { report_id: 123 })
export async function downloadPdf(
	url: string,
	method: 'get' | 'post' = 'get',
	data?: unknown,
	config: Record<string, unknown> = {}
): Promise<ParsedBlobResponse> {
	// fetchAndDownload utilisera responseType: 'blob' et déclenchera le téléchargement si un fichier est reçu
	const parsed = await fetchAndDownload(url, method, data, config);
	// parsed.files a déjà été téléchargé par downloadFromAxiosResponse via fetchAndDownload
	return parsed;
}