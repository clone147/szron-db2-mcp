import { stringify } from 'csv-stringify/sync';

export interface ColumnMapping {
  source: string;
  target: string;
}

export class CsvUtils {
  /**
   * Clean and sanitize values for CSV output
   */
  private static cleanValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    let str = String(value);
    
    // Remove or replace non-ASCII characters that might cause issues in Claude Desktop
    str = str.replace(/[^\x20-\x7E\r\n\t]/g, '?');
    
    // Trim whitespace
    str = str.trim();
    
    return str;
  }

  /**
   * Convert query result to CSV format
   */
  static resultToCsv(data: any[], columnMappings?: ColumnMapping[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    // If no column mappings provided, use all columns from first row
    if (!columnMappings) {
      const firstRow = data[0];
      const headers = Object.keys(firstRow);
      const mappings = headers.map(h => ({ source: h, target: h }));
      return this.resultToCsvWithMappings(data, mappings);
    }

    return this.resultToCsvWithMappings(data, columnMappings);
  }

  /**
   * Convert query result to CSV with specific column mappings
   */
  private static resultToCsvWithMappings(data: any[], mappings: ColumnMapping[]): string {
    // Create header row
    const headers = mappings.map(m => m.target);
    
    // Create data rows
    const rows = data.map(row => {
      return mappings.map(mapping => {
        const value = row[mapping.source];
        return this.cleanValue(value);
      });
    });

    // Combine headers and data
    const allRows = [headers, ...rows];

    return stringify(allRows, {
      header: false,
      quoted: true,
      quoted_empty: true,
      quoted_string: true
    });
  }

  /**
   * Convert database metadata result to CSV
   */
  static metadataToCsv(data: any[], columns: { source: string; target: string }[]): string {
    return this.resultToCsv(data, columns);
  }

  /**
   * Parse CSV string to array of objects
   */
  static parseCsv(csvContent: string): any[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) {
      return [];
    }

    // Parse header row
    const headers = this.parseCsvLine(lines[0]);
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return data;
  }

  /**
   * Simple CSV line parser (handles quoted values)
   */
  private static parseCsvLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
}