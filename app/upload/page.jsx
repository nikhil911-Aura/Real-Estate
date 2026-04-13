'use client';

import { useState, useCallback } from 'react';
import ProgressBar from '../../components/ProgressBar';

function UploadCard({ title, description, uploadUrl, onComplete }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) setFile(f);
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const pollJob = async (jobId) => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();
        setJob(data);

        if (data.status === 'done') {
          clearInterval(poll);
          setUploading(false);
          setResult(data.result);
          if (onComplete) onComplete(data.result);
        } else if (data.status === 'error') {
          clearInterval(poll);
          setUploading(false);
          setError(data.error);
        }
      } catch (err) {
        clearInterval(poll);
        setUploading(false);
        setError('Failed to check job status');
      }
    }, 2000);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    setJob({ progress: 0, message: 'Uploading...' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(uploadUrl, { method: 'POST', body: formData });
      const data = await res.json();

      if (data.jobId) {
        pollJob(data.jobId);
      } else {
        setError(data.error || 'Upload failed');
        setUploading(false);
      }
    } catch (err) {
      setError('Upload failed: ' + err.message);
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-4">{description}</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <svg className="mx-auto w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-gray-600 mb-2">Drag & drop your CSV file here</p>
        <label className="inline-block px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
          Browse Files
          <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
        </label>
      </div>

      {file && (
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-5 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Processing...' : 'Upload'}
          </button>
        </div>
      )}

      {job && uploading && (
        <div className="mt-4">
          <ProgressBar progress={job.progress || 0} message={job.message || ''} />
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm font-semibold text-green-800 mb-2">Upload Complete</p>
          {result.flips_confirmed !== undefined && (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Total records in file:</div>
                <div className="font-semibold text-gray-900">{(result.rows_processed || 0).toLocaleString()}</div>
                <div className="text-gray-600">Flips detected:</div>
                <div className="font-semibold text-gray-900">{result.flips_confirmed}</div>
                <div className="text-gray-600">Tier A:</div>
                <div className="font-semibold text-green-600">{result.tier_counts?.A || 0}</div>
                <div className="text-gray-600">Tier B:</div>
                <div className="font-semibold text-blue-600">{result.tier_counts?.B || 0}</div>
                <div className="text-gray-600">Tier C:</div>
                <div className="font-semibold text-amber-600">{result.tier_counts?.C || 0}</div>
                <div className="text-gray-600">Tier D:</div>
                <div className="font-semibold text-gray-600">{result.tier_counts?.D || 0}</div>
                <div className="text-gray-600">ZIP models built:</div>
                <div className="font-semibold text-gray-900">{result.models_built || 0}</div>
              </div>
              {result.rescore && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-sm font-semibold text-green-800 mb-2">Active Listings Re-scored</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">Listings re-scored:</div>
                    <div className="font-semibold text-gray-900">{result.rescore.total_scored}</div>
                    <div className="text-gray-600">HOT:</div>
                    <div className="font-semibold text-red-600">{result.rescore.bucket_counts?.HOT || 0}</div>
                    <div className="text-gray-600">UNDERWRITE:</div>
                    <div className="font-semibold text-orange-600">{result.rescore.bucket_counts?.UNDERWRITE || 0}</div>
                    <div className="text-gray-600">WATCH:</div>
                    <div className="font-semibold text-yellow-600">{result.rescore.bucket_counts?.WATCH || 0}</div>
                    <div className="text-gray-600">SUPPRESSED:</div>
                    <div className="font-semibold text-gray-500">{result.rescore.bucket_counts?.SUPPRESSED || 0}</div>
                  </div>
                </div>
              )}
            </>
          )}
          {result.bucket_counts !== undefined && !result.flips_confirmed && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">Total records in file:</div>
              <div className="font-semibold text-gray-900">{(result.rows_processed || 0).toLocaleString()}</div>
              <div className="text-gray-600">Listings scored:</div>
              <div className="font-semibold text-gray-900">{result.total_scored}</div>
              <div className="text-gray-600">HOT:</div>
              <div className="font-semibold text-red-600">{result.bucket_counts?.HOT || 0}</div>
              <div className="text-gray-600">UNDERWRITE:</div>
              <div className="font-semibold text-orange-600">{result.bucket_counts?.UNDERWRITE || 0}</div>
              <div className="text-gray-600">WATCH:</div>
              <div className="font-semibold text-yellow-600">{result.bucket_counts?.WATCH || 0}</div>
              <div className="text-gray-600">SUPPRESSED:</div>
              <div className="font-semibold text-gray-500">{result.bucket_counts?.SUPPRESSED || 0}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Data Upload</h1>
      <p className="text-gray-500 mb-6">Upload your Realtracs MLS data to detect flips and score opportunities.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UploadCard
          title="Historical Sold Data"
          description="Upload 3 years of sold records from Realtracs MLS"
          uploadUrl="/api/upload/historical"
        />
        <UploadCard
          title="Active Listings"
          description="Upload current active MLS listings"
          uploadUrl="/api/upload/active"
        />
      </div>
    </div>
  );
}
