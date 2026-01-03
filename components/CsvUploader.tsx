
import React, { useState } from 'react';

interface CsvUploaderProps {
  onFileUpload: (file: File) => void;
  isProcessing: boolean;
  progress: number;
}

const CsvUploader: React.FC<CsvUploaderProps> = ({ onFileUpload, isProcessing, progress }) => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = () => {
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <h2 className="text-2xl font-bold">Upload and Process CSV</h2>
          <p className="text-gray-500">Let Gemini AI extract and structure your receipt data from a CSV file.</p>
          
          {!isProcessing ? (
            <>
              <input type="file" accept=".csv" onChange={handleFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
              <button onClick={handleUpload} disabled={!file} className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all active:scale-95 disabled:bg-gray-400">
                Upload and Process
              </button>
            </>
          ) : (
            <div className="w-full text-center">
              <p className="font-bold mb-2">Processing your CSV...</p>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{Math.round(progress)}% complete</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CsvUploader;
