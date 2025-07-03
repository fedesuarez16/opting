'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get, push, set } from 'firebase/database';
import { database } from '@/lib/firebase';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  branchId?: string;
}

interface DocumentData {
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  branchId?: string;
  [key: string]: string | number | undefined;
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDocuments = async () => {
      if (user) {
        try {
          const userRef = ref(database, `users/${user.uid}`);
          const userSnapshot = await get(userRef);
          const userData = userSnapshot.val();

          let documentsRef;
          if (userData.role === 'admin') {
            documentsRef = ref(database, 'documents');
          } else if (userData.role === 'general_manager') {
            documentsRef = ref(database, 'documents');
          } else if (userData.role === 'branch_manager' && userData.branchId) {
            documentsRef = ref(database, `documents/${userData.branchId}`);
          }

          if (documentsRef) {
            const snapshot = await get(documentsRef);
            if (snapshot.exists()) {
              const docsData = snapshot.val();
              const docsArray = Object.entries(docsData).map(([id, docData]) => ({
                id,
                ...docData as DocumentData
              }));
              setDocuments(docsArray);
            }
          }
        } catch (error) {
          console.error('Error fetching documents:', error);
          setError('Failed to fetch documents');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchDocuments();
  }, [user]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');

      // In a real application, you would upload the file to Firebase Storage
      // and get the download URL. For this example, we'll just simulate it.
      const userRef = ref(database, `users/${user?.uid}`);
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val();

      const newDocRef = push(ref(database, 'documents'));
      await set(newDocRef, {
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file), // In real app, use Firebase Storage URL
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.email,
        branchId: userData.branchId,
      });

      // Refresh documents list
      const snapshot = await get(ref(database, 'documents'));
      if (snapshot.exists()) {
        const docsData = snapshot.val();
        const docsArray = Object.entries(docsData).map(([id, docData]) => ({
          id,
          ...docData as DocumentData
        }));
        setDocuments(docsArray);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </label>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="mt-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {doc.name}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {doc.type}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <span className="mr-2">📅</span>
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <span className="mr-2">👤</span>
                          {doc.uploadedBy}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 