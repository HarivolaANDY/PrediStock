/**
 * Exports data to a CSV file.
 * 
 * @param data - The array of objects to export.
 * @param filename - The name of the file to save (including .csv extension).
 * @param headers - The column headers for the CSV.
 * @param keys - The keys to extract from each data object. Supports nested keys with dot notation.
 * @param separator - The CSV separator (default: ';').
 */
export function exportToCSV(
  data: any[],
  filename: string,
  headers: string[],
  keys: string[],
  separator: string = ';'
) {
  if (!data || data.length === 0) {
    throw new Error("Aucune donnée à exporter");
  }

  const csvRows: string[] = [];

  // Add headers
  csvRows.push(headers.join(separator));

  // Add data rows
  for (const row of data) {
    const values = keys.map((key) => {
      // Handle nested keys like 'infos.name'
      const val = key.split('.').reduce((obj, k) => obj?.[k], row);
      
      // Format value: handle null/undefined, escape quotes, and wrap in double quotes
      const stringValue = val === null || val === undefined ? '' : String(val);
      const escaped = stringValue.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(separator));
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
