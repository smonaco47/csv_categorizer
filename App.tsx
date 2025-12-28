
import React, { useState } from 'react';
import { CSVImporter } from './components/CSVImporter';
import { categorizeData } from './services/geminiService';
import { AppStatus, CSVRow, CategorizedItem } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [data, setData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [exportColumns, setExportColumns] = useState<string[]>([]);
  const [results, setResults] = useState<CategorizedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // New Options State
  const [maxCategories, setMaxCategories] = useState<string>('');
  const [predefinedCategories, setPredefinedCategories] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const handleDataLoaded = (loadedData: CSVRow[], columns: string[]) => {
    setData(loadedData);
    setHeaders(columns);
    setExportColumns(columns);
    const initialTarget = columns.find(c => c.toLowerCase() === 'foo') || columns[0] || '';
    setTargetColumn(initialTarget);
    setStatus(AppStatus.FILE_LOADED);
  };

  const startCategorization = async () => {
    if (!targetColumn) return;
    setStatus(AppStatus.CATEGORIZING);
    setError(null);

    const options = {
      maxCategories: maxCategories ? parseInt(maxCategories, 10) : undefined,
      predefinedCategories: predefinedCategories 
        ? predefinedCategories.split(',').map(c => c.trim()).filter(Boolean) 
        : undefined
    };

    try {
      const textsToProcess = data.map(row => row[targetColumn]).filter(Boolean);
      const categorized = await categorizeData(textsToProcess, options);
      setResults(categorized);
      setStatus(AppStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during categorization.");
      setStatus(AppStatus.ERROR);
    }
  };

  const downloadCSV = () => {
    const resultMap = new Map<string, CategorizedItem>();
    results.forEach(item => resultMap.set(item.originalText, item));

    const csvHeaders = [...exportColumns, 'Category', 'Confidence', 'Reason'];
    const csvRows = data.map(row => {
      const targetVal = row[targetColumn];
      const categoryInfo = resultMap.get(targetVal);
      
      const line = exportColumns.map(col => `"${(row[col] || '').replace(/"/g, '""')}"`);
      line.push(`"${(categoryInfo?.category || 'Uncategorized').replace(/"/g, '""')}"`);
      line.push(`"${categoryInfo?.confidence || 0}"`);
      line.push(`"${(categoryInfo?.reason || '').replace(/"/g, '""')}"`);
      
      return line.join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `categorized_data_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setData([]);
    setHeaders([]);
    setResults([]);
    setError(null);
    setMaxCategories('');
    setPredefinedCategories('');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          Smart CSV <span className="text-blue-600">Categorizer</span>
        </h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Upload any CSV, pick a text field, and let Gemini AI intelligently group your data.
        </p>
      </header>

      <main className="space-y-6">
        {status === AppStatus.IDLE && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CSVImporter onDataLoaded={handleDataLoaded} isLoading={false} />
          </div>
        )}

        {(status === AppStatus.FILE_LOADED || status === AppStatus.CATEGORIZING || status === AppStatus.ERROR) && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-800">Step 2: Configure Analysis</h2>
              <button onClick={reset} className="text-sm text-slate-400 hover:text-red-500 transition-colors">
                Cancel & Clear
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Text Column to Categorize
                </label>
                <select
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  disabled={status === AppStatus.CATEGORIZING}
                  className="w-full rounded-lg border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all py-2.5 px-3 bg-slate-50 text-slate-700"
                >
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <p className="mt-2 text-xs text-slate-400">
                  Target field for semantic analysis.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Columns to include in Export
                </label>
                <div className="max-h-32 overflow-y-auto border border-slate-100 rounded-lg p-3 bg-slate-50 space-y-1">
                  {headers.map(h => (
                    <label key={h} className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportColumns.includes(h)}
                        disabled={status === AppStatus.CATEGORIZING}
                        onChange={(e) => {
                          if (e.target.checked) setExportColumns([...exportColumns, h]);
                          else setExportColumns(exportColumns.filter(c => c !== h));
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{h}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Constraints Section */}
            <div className="border-t border-slate-100 pt-6 mb-8">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {showAdvanced ? 'Hide Advanced Constraints' : 'Add Limits & Specific Categories'}
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 p-4 bg-slate-50 rounded-xl animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Maximum Categories
                    </label>
                    <input 
                      type="number" 
                      min="1"
                      max="50"
                      value={maxCategories}
                      onChange={(e) => setMaxCategories(e.target.value)}
                      placeholder="e.g. 10"
                      disabled={status === AppStatus.CATEGORIZING}
                      className="w-full rounded-lg border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 bg-white"
                    />
                    <p className="mt-1.5 text-xs text-slate-400">
                      Force the AI to group items more broadly.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Predefined Categories (Comma Separated)
                    </label>
                    <input 
                      type="text" 
                      value={predefinedCategories}
                      onChange={(e) => setPredefinedCategories(e.target.value)}
                      placeholder="Support, Sales, Feedback, Other"
                      disabled={status === AppStatus.CATEGORIZING}
                      className="w-full rounded-lg border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 bg-white"
                    />
                    <p className="mt-1.5 text-xs text-slate-400">
                      If set, Gemini will prioritize these specific labels.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center">
              {status === AppStatus.CATEGORIZING ? (
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4"></div>
                  <p className="text-slate-600 font-medium">Gemini is thinking...</p>
                  <p className="text-sm text-slate-400">Applying constraints and analyzing data.</p>
                </div>
              ) : (
                <button
                  onClick={startCategorization}
                  disabled={!targetColumn || exportColumns.length === 0}
                  className="px-10 py-3.5 bg-blue-600 text-white font-bold rounded-full shadow-lg shadow-blue-100 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
                >
                  Run Analysis on {data.length} Rows
                </button>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>
          </div>
        )}

        {status === AppStatus.COMPLETED && (
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Analysis Complete!</h2>
                <p className="text-slate-500">Categorized into {new Set(results.map(r => r.category)).size} groups.</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={reset}
                  className="px-6 py-2 border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 transition-colors font-medium"
                >
                  Start Over
                </button>
                <button
                  onClick={downloadCSV}
                  className="px-8 py-2 bg-green-600 text-white rounded-full font-bold shadow-lg shadow-green-100 hover:bg-green-700 transition-all flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
               {Array.from(new Set(results.map(r => r.category))).slice(0, 6).map(cat => {
                 const count = results.filter(r => r.category === cat).length;
                 return (
                   <div key={cat} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                     <span className="text-xs font-bold text-blue-500 uppercase tracking-wider block mb-1 truncate">{cat}</span>
                     <div className="text-2xl font-bold text-slate-800">{((count/results.length)*100).toFixed(1)}%</div>
                     <div className="text-sm text-slate-400">{count} items</div>
                   </div>
                 );
               })}
            </div>

            <div className="overflow-hidden border border-slate-100 rounded-xl">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Original Text</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {results.slice(0, 10).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-900 truncate max-w-xs">{item.originalText}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] uppercase font-bold tracking-tight">{item.category}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 text-right">{(item.confidence * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-slate-50 p-3 text-center text-xs text-slate-400 italic">
                Showing top 10 rows preview. Full results in CSV download.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
