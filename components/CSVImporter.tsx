
import React, { useRef, useState } from 'react';
import { CSVRow } from '../types';

interface CSVImporterProps {
  onDataLoaded: (data: CSVRow[], columns: string[]) => void;
  isLoading: boolean;
}

export const CSVImporter: React.FC<CSVImporterProps> = ({ onDataLoaded, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const parseCSV = (text: string) => {
    // Robust regex-based CSV parser to handle quoted strings containing commas
    const rows: string[][] = [];
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    lines.forEach(line => {
      const row: string[] = [];
      let currentField = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      row.push(currentField.trim());
      rows.push(row.map(val => val.replace(/^"|"$/g, '').trim()));
    });

    if (rows.length < 2) return;

    const headers = rows[0];
    const data: CSVRow[] = rows.slice(1).map(row => {
      const entry: CSVRow = {};
      headers.forEach((header, index) => {
        entry[header] = row[index] || '';
      });
      return entry;
    });

    onDataLoaded(data, headers);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className={`relative flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-3xl transition-all cursor-pointer group shadow-sm
        ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-400'}`}
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
      onClick={() => !isLoading && fileInputRef.current?.click()}
    >
      <input
        type="file"
        accept=".csv"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
        disabled={isLoading}
      />
      
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors 
        ${dragActive ? 'bg-blue-200' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-2">Click or drag CSV here</h3>
      <p className="text-slate-400 text-center max-w-sm">
        Supports large CSV files. We recommend files with clear headers like "Subject", "Description", or "Feedback".
      </p>

      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}
    </div>
  );
};
