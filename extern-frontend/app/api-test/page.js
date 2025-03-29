'use client';

import { useState, useEffect } from 'react';
import { authAPI, customersAPI, appointmentsAPI } from '../lib/api';

export default function ApiTestPage() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check if token exists in localStorage
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('token');
      setToken(savedToken);
    }
  }, []);

  const testEndpoint = async (name, apiCall) => {
    setLoading(prev => ({ ...prev, [name]: true }));
    try {
      const data = await apiCall();
      setResults(prev => ({ 
        ...prev, 
        [name]: { 
          status: 'success', 
          data 
        } 
      }));
    } catch (error) {
      console.error(`Error testing ${name}:`, error);
      setResults(prev => ({ 
        ...prev, 
        [name]: { 
          status: 'error', 
          error: error.message || 'Unknown error',
          details: error.response?.data?.error || null
        } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  // Test login with sample credentials
  const testLogin = async () => {
    const email = document.getElementById('test-email').value;
    const password = document.getElementById('test-password').value;
    
    if (!email || !password) {
      setResults(prev => ({ 
        ...prev, 
        login: { 
          status: 'error', 
          error: 'Please enter both email and password'
        } 
      }));
      return;
    }
    
    await testEndpoint('login', () => authAPI.login(email, password));
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">API Endpoint Testing</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
        <div className="p-3 bg-gray-100 rounded mb-4">
          <p><strong>API Base URL:</strong> {process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}</p>
          <p><strong>Authentication:</strong> {token ? 'Token found in localStorage' : 'No token found'}</p>
        </div>
      </div>

      {!token && (
        <div className="mb-8 p-4 border rounded">
          <h2 className="text-xl font-semibold mb-4">Test Authentication</h2>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <input 
              id="test-email" 
              type="email" 
              placeholder="Email" 
              className="p-2 border rounded flex-1" 
            />
            <input 
              id="test-password" 
              type="password" 
              placeholder="Password" 
              className="p-2 border rounded flex-1" 
            />
            <button 
              onClick={testLogin} 
              disabled={loading.login}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading.login ? 'Testing...' : 'Test Login'}
            </button>
          </div>
          
          {results.login && (
            <div className={`p-3 rounded mt-2 ${results.login.status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
              <p><strong>Status:</strong> {results.login.status}</p>
              {results.login.status === 'success' && (
                <div>
                  <p><strong>Token received:</strong> Yes</p>
                  <p className="text-sm text-gray-600">Token has been saved to localStorage. Refresh the page to use it for other tests.</p>
                </div>
              )}
              {results.login.status === 'error' && (
                <p><strong>Error:</strong> {results.login.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customers Endpoints */}
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-3">Customers Endpoints</h2>
          
          <div className="space-y-3">
            <div>
              <button 
                onClick={() => testEndpoint('getAllCustomers', customersAPI.getAll)}
                disabled={loading.getAllCustomers || !token}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading.getAllCustomers ? 'Testing...' : 'Test GET /customers'}
              </button>
              
              {results.getAllCustomers && (
                <div className={`p-2 rounded mt-2 text-sm ${results.getAllCustomers.status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p><strong>Status:</strong> {results.getAllCustomers.status}</p>
                  {results.getAllCustomers.status === 'success' && (
                    <p><strong>Customers count:</strong> {results.getAllCustomers.data.length}</p>
                  )}
                  {results.getAllCustomers.status === 'error' && (
                    <p><strong>Error:</strong> {results.getAllCustomers.error}</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Add more customer endpoints here if needed */}
          </div>
        </div>
        
        {/* Appointments Endpoints */}
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-3">Appointments Endpoints</h2>
          
          <div className="space-y-3">
            <div>
              <button 
                onClick={() => testEndpoint('getAllAppointments', appointmentsAPI.getAll)}
                disabled={loading.getAllAppointments || !token}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading.getAllAppointments ? 'Testing...' : 'Test GET /appointments'}
              </button>
              
              {results.getAllAppointments && (
                <div className={`p-2 rounded mt-2 text-sm ${results.getAllAppointments.status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p><strong>Status:</strong> {results.getAllAppointments.status}</p>
                  {results.getAllAppointments.status === 'success' && (
                    <p><strong>Appointments count:</strong> {results.getAllAppointments.data.length}</p>
                  )}
                  {results.getAllAppointments.status === 'error' && (
                    <p><strong>Error:</strong> {results.getAllAppointments.error}</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Add more appointment endpoints here if needed */}
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-sm text-gray-600">
        <p><strong>Note:</strong> Some endpoints require authentication. Please login first to test these endpoints.</p>
      </div>
    </div>
  );
}
