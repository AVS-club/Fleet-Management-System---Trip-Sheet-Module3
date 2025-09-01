export const parseCSV = async (file: File): Promise<any[]> => {
  const Papa = await import('papaparse');
  return new Promise((resolve, reject) => {
    Papa.default.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error('Failed to parse CSV file'));
          return;
        }
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const generateCSV = async (data: any[], headers: { [key: string]: string }): Promise<string> => {
  const Papa = await import('papaparse');
  const csvData = data.map(row => {
    const newRow: { [key: string]: any } = {};
    Object.entries(headers).forEach(([key, label]) => {
      newRow[label] = row[key];
    });
    return newRow;
  });

  return Papa.default.unparse(csvData);
};

export const downloadCSV = (filename: string, data: string) => {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};