'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';

interface ReportData {
  totalDocuments: number;
  documentsByType: Record<string, number>;
  documentsByMonth: Record<string, number>;
  userActivity: {
    email: string;
    documentsUploaded: number;
    lastActive: string;
  }[];
}

interface DocumentData {
  type: string;
  uploadedAt: string;
  uploadedBy: string;
  [key: string]: string | number | boolean;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReportData = async () => {
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
              const docsArray = Object.values(docsData) as DocumentData[];

              // Calculate metrics
              const documentsByType: Record<string, number> = {};
              const documentsByMonth: Record<string, number> = {};
              const userActivity: Record<string, { documentsUploaded: number; lastActive: string }> = {};

              docsArray.forEach((doc) => {
                // Count by type
                documentsByType[doc.type] = (documentsByType[doc.type] || 0) + 1;

                // Count by month
                const month = new Date(doc.uploadedAt).toLocaleString('default', { month: 'short', year: 'numeric' });
                documentsByMonth[month] = (documentsByMonth[month] || 0) + 1;

                // User activity
                if (!userActivity[doc.uploadedBy]) {
                  userActivity[doc.uploadedBy] = {
                    documentsUploaded: 0,
                    lastActive: doc.uploadedAt,
                  };
                }
                userActivity[doc.uploadedBy].documentsUploaded++;
                if (new Date(doc.uploadedAt) > new Date(userActivity[doc.uploadedBy].lastActive)) {
                  userActivity[doc.uploadedBy].lastActive = doc.uploadedAt;
                }
              });

              setReportData({
                totalDocuments: docsArray.length,
                documentsByType,
                documentsByMonth,
                userActivity: Object.entries(userActivity).map(([email, data]) => ({
                  email,
                  ...data,
                })),
              });
            }
          }
        } catch (error) {
          console.error('Error fetching report data:', error);
          setError('Failed to fetch report data');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchReportData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Documents Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">📄</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Documents
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {reportData.totalDocuments}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Documents by Type */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900">Documents by Type</h3>
              <div className="mt-4">
                {Object.entries(reportData.documentsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500">{type}</span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Documents by Month */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900">Documents by Month</h3>
              <div className="mt-4">
                {Object.entries(reportData.documentsByMonth)
                  .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                  .map(([month, count]) => (
                    <div key={month} className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-500">{month}</span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* User Activity Table */}
        <div className="mt-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-gray-900">User Activity</h3>
            </div>
            <div className="border-t border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documents Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.userActivity.map((user) => (
                    <tr key={user.email}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.documentsUploaded}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.lastActive).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 