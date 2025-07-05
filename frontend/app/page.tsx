'use client';

import { useState } from 'react';

// Interfaces for API response data
interface ResumeData {
  filename: string;
  extracted_text: string;
  parsed_data: any; // Replace with specific type if known
  message: string;
}

interface JdContent {
  filename?: string;
  content: string;
  message: string;
}

interface ImprovementResults {
  improved_summary: string;
  improved_bullets: string[];
  suggested_skills: string[];
  match_analysis: string;
  extracted_resume_data: any; // Replace with specific type if known
  message: string;
}

const Home: React.FC = () => {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState<string>('');
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [jdContent, setJdContent] = useState<JdContent | null>(null);
  const [improvementResults, setImprovementResults] = useState<ImprovementResults | null>(null);
  const [extractedResumeData, setExtractedResumeData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
      setError('');
    }
  };

  const handleJdFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      setJdFile(e.target.files[0]);
      setError('');
    }
  };

  const uploadResume = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!resumeFile) {
      setError('Please select a resume file.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', resumeFile);

      const response = await fetch(`${BACKEND_URL}/api/upload/resume`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData: { error?: string } = await response.json();
        throw new Error(errData.error || 'Failed to upload resume.');
      }

      const data: ResumeData = await response.json();
      setResumeData(data);
    //   alert(data.message);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error uploading resume:', err);
    } finally {
      setLoading(false);
    }
  };

  const uploadJd = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!jdFile && !jdText) {
      setError('Please select a JD file or paste JD text.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      if (jdFile) {
        formData.append('file', jdFile);
      } else if (jdText) {
        formData.append('text', jdText);
      }

      const response = await fetch(`${BACKEND_URL}/api/upload/jd`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData: { error?: string } = await response.json();
        throw new Error(errData.error || 'Failed to upload JD.');
      }

      const data: JdContent = await response.json();
      setJdContent(data);
    //   alert(data.message);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error uploading JD:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerImprovement = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!resumeData || !jdContent) {
      setError('Please upload both resume and job description first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${BACKEND_URL}/api/improve/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume_text: resumeData.extracted_text,
          jd_text: jdContent.content,
        }),
      });

      if (!response.ok) {
        const errData: { error?: string } = await response.json();
        throw new Error(errData.error || 'Failed to get improvements.');
      }

      const data: ImprovementResults = await response.json();
      setImprovementResults(data);
      setExtractedResumeData(data.extracted_resume_data);
    //   alert(data.message);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error triggering improvement:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadResume = async (e: React.MouseEvent<HTMLButtonElement>, format: 'docx' | 'pdf'): Promise<void> => {
    e.preventDefault();
    if (!improvementResults || !resumeData) {
      setError('Please generate improvements and ensure resume is uploaded first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        format,
        original_extracted_data: extractedResumeData,
        improved_summary: improvementResults.improved_summary,
        improved_bullets: improvementResults.improved_bullets,
        suggested_skills: improvementResults.suggested_skills,
        match_analysis: improvementResults.match_analysis,
      };

      const response = await fetch(`${BACKEND_URL}/api/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData: { error?: string } = await response.json();
        throw new Error(errData.error || `Failed to download ${format}.`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `tailored_resume.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

    //   alert(`Resume downloaded as .${format}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error downloading resume:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-12 tracking-tight text-center animate-in fade-in duration-500">
        Contextual Resume Improver
      </h1>

      {error && (
        <div className="w-full max-w-4xl bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-8 animate-in fade-in duration-300 shadow-md" role="alert">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl bg-white p-6 sm:p-8 rounded-2xl shadow-xl mb-8 transition-all duration-300 hover:shadow-2xl">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">1. Upload Your Resume</h2>
        <form onSubmit={uploadResume}>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleResumeUpload}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-3 file:px-5 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200"
            aria-label="Upload resume file"
          />
          <button
            type="submit"
            className="mt-6 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 flex items-center"
            disabled={loading || !resumeFile}
          >
            {loading && resumeFile ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              'Upload Resume'
            )}
          </button>
        </form>
        {resumeData && (
          <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg animate-in slide-in-from-bottom-2">
            <h3 className="font-semibold text-blue-800 text-lg mb-2">Resume Uploaded</h3>
            <p className="text-blue-700">Filename: {resumeData.filename}</p>
            <p className="text-blue-700">Preview: {resumeData.extracted_text.substring(0, 200)}...</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-blue-600 hover:underline font-medium">View Parsed Data</summary>
              <pre className="whitespace-pre-wrap text-xs text-blue-900 bg-blue-100 p-3 rounded-lg mt-2">
                {JSON.stringify(resumeData.parsed_data, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl bg-white p-6 sm:p-8 rounded-2xl shadow-xl mb-8 transition-all duration-300 hover:shadow-2xl">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">2. Upload Job Description</h2>
        <form onSubmit={uploadJd}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="jdFileInput" className="block text-sm font-medium text-gray-700 mb-2">
                Upload JD File (PDF/TXT)
              </label>
              <input
                type="file"
                id="jdFileInput"
                accept=".pdf,.txt"
                onChange={handleJdFileUpload}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-3 file:px-5 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200"
                aria-label="Upload job description file"
              />
            </div>
            <div>
              <label htmlFor="jdTextArea" className="block text-sm font-medium text-gray-700 mb-2">
                Or Paste JD Text
              </label>
              <textarea
                id="jdTextArea"
                value={jdText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJdText(e.target.value)}
                rows={6}
                className="block p-3 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="Paste your job description here..."
                aria-label="Paste job description text"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-6 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 flex items-center"
            disabled={loading || (!jdFile && !jdText)}
          >
            {loading && (jdFile || jdText) ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              'Upload/Process JD'
            )}
          </button>
        </form>
        {jdContent && (
          <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg animate-in slide-in-from-bottom-2">
            <h3 className="font-semibold text-blue-800 text-lg mb-2">Job Description Processed</h3>
            <p className="text-blue-700">Source: {jdContent.filename || 'Pasted Text'}</p>
            <p className="text-blue-700">Preview: {jdContent.content.substring(0, 200)}...</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl bg-white p-6 sm:p-8 rounded-2xl shadow-xl mb-8 transition-all duration-300 hover:shadow-2xl">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">3. Get AI Improvements</h2>
        <form onSubmit={triggerImprovement}>
          <button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold rounded-lg shadow-md hover:from-green-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 flex items-center"
            disabled={loading || !resumeData || !jdContent}
          >
            {loading && resumeData && jdContent ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              'Generate Improvements'
            )}
          </button>
        </form>

        {improvementResults && (
          <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg animate-in slide-in-from-bottom-2">
            <h3 className="text-xl md:text-2xl font-semibold text-green-800 mb-6">AI Suggestions</h3>
            <div className="space-y-8">
              <div>
                <h4 className="font-bold text-green-700 text-lg">Improved Summary</h4>
                <p className="text-gray-800 leading-relaxed">{improvementResults.improved_summary}</p>
              </div>
              <div>
                <h4 className="font-bold text-green-700 text-lg">Improved Bullet Points</h4>
                <ul className="list-disc list-inside text-gray-800 space-y-3">
                  {improvementResults.improved_bullets.map((bullet: string, index: number) => (
                    <li key={index} className="leading-relaxed">{bullet}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-green-700 text-lg">Suggested Skills</h4>
                <p className="text-gray-800">{improvementResults.suggested_skills.join(', ')}</p>
              </div>
              <div>
                <h4 className="font-bold text-green-700 text-lg">Match Analysis</h4>
                <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-green-100 p-4 rounded-lg">
                  {improvementResults.match_analysis}
                </pre>
              </div>
              <div className="pt-6 border-t border-green-200">
                <h3 className="text-xl md:text-2xl font-semibold text-green-800 mb-6">4. Export Tailored Resume</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => downloadResume(e, 'docx')}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 flex items-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Downloading...
                      </>
                    ) : (
                      'Download DOCX'
                    )}
                  </button>
                  <button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => downloadResume(e, 'pdf')}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 flex items-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Downloading...
                      </>
                    ) : (
                      'Download PDF'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;