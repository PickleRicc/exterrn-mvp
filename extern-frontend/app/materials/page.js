'use client';

import { useState, useEffect } from 'react';
import { materialsAPI } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';

export default function MaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [materials, setMaterials] = useState([]);
  const [craftsmanId, setCraftsmanId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterInStock, setFilterInStock] = useState('');

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }

    // Get craftsman ID from token
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      if (tokenData.craftsmanId) {
        setCraftsmanId(tokenData.craftsmanId);
        fetchMaterials(tokenData.craftsmanId);
      } else {
        setError('Your account is not set up as a craftsman. Please contact support.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error parsing token:', err);
      setError('Session error. Please log in again.');
      setLoading(false);
    }
  }, []);

  const fetchMaterials = async (craftsmanId, filters = {}) => {
    setLoading(true);
    try {
      // Add craftsman_id to filters
      const queryParams = { 
        ...filters,
        craftsman_id: craftsmanId 
      };
      
      const data = await materialsAPI.getAll(queryParams);
      // Ensure data is an array before setting it to state
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching materials:', err);
      setError('Failed to load materials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    const filters = {};
    if (filterCategory) filters.category = filterCategory;
    if (filterInStock) filters.in_stock = filterInStock === 'true';
    fetchMaterials(craftsmanId, filters);
  };

  const handleDeleteMaterial = async (id) => {
    if (!confirm('Are you sure you want to delete this material?')) {
      return;
    }

    try {
      await materialsAPI.delete(id);
      // Refresh the materials list
      fetchMaterials(craftsmanId);
    } catch (err) {
      console.error('Error deleting material:', err);
      setError('Failed to delete material. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
      <Header />
      <main className="flex-grow container mx-auto px-5 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                  Tiling Materials
                </span>
              </h1>
              <p className="text-white/70">Manage your tiling materials inventory</p>
            </div>
            <Link 
              href="/materials/new" 
              className="mt-4 md:mt-0 px-5 py-2.5 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Add New Material
            </Link>
          </div>

          {/* Filters */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 mb-6 border border-white/10">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="categoryFilter" className="block mb-2 text-sm font-medium text-white">
                  Filter by Category
                </label>
                <select
                  id="categoryFilter"
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setTimeout(handleFilterChange, 100);
                  }}
                  className="w-full p-2.5 border border-white/10 rounded-lg bg-white/5 text-white appearance-none focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                >
                  <option value="">All Categories</option>
                  <option value="ceramic">Ceramic Tiles</option>
                  <option value="porcelain">Porcelain Tiles</option>
                  <option value="natural_stone">Natural Stone</option>
                  <option value="mosaic">Mosaic Tiles</option>
                  <option value="glass">Glass Tiles</option>
                  <option value="cement">Cement Tiles</option>
                  <option value="metal">Metal Tiles</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="stockFilter" className="block mb-2 text-sm font-medium text-white">
                  Filter by Stock
                </label>
                <select
                  id="stockFilter"
                  value={filterInStock}
                  onChange={(e) => {
                    setFilterInStock(e.target.value);
                    setTimeout(handleFilterChange, 100);
                  }}
                  className="w-full p-2.5 border border-white/10 rounded-lg bg-white/5 text-white appearance-none focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                >
                  <option value="">All Items</option>
                  <option value="true">In Stock</option>
                  <option value="false">Out of Stock</option>
                </select>
              </div>
            </div>
          </div>

          {/* Materials List */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#00c2ff]"></div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-white">
              <p>{error}</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-8 text-center border border-white/10">
              <svg className="w-16 h-16 mx-auto text-white/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
              </svg>
              <h3 className="text-xl font-medium mb-2">No Materials Found</h3>
              <p className="text-white/70 mb-6">You haven't added any tiling materials yet.</p>
              <Link 
                href="/materials/new" 
                className="px-5 py-2.5 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300 inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add Your First Material
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {materials.map((material) => (
                <div key={material.id} className="bg-white/5 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 transition-all duration-300 hover:shadow-lg hover:bg-white/10">
                  <div className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">{material.name}</h3>
                        <p className="text-white/70 text-sm mb-3">{material.category}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        material.in_stock 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {material.in_stock ? 'In Stock' : 'Out of Stock'}
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/60">Price per sqm:</span>
                        <span className="font-medium">€{material.price_per_sqm ? material.price_per_sqm.toFixed(2) : '0.00'}</span>
                      </div>
                      {material.quantity && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Quantity:</span>
                          <span className="font-medium">{material.quantity} {material.unit || 'pcs'}</span>
                        </div>
                      )}
                      {material.description && (
                        <p className="text-white/80 text-sm mt-3 border-t border-white/10 pt-3">
                          {material.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex border-t border-white/10">
                    <Link 
                      href={`/materials/${material.id}`}
                      className="flex-1 py-3 text-center text-white/80 hover:bg-white/10 transition-colors duration-200"
                    >
                      View
                    </Link>
                    <Link 
                      href={`/materials/${material.id}/edit`}
                      className="flex-1 py-3 text-center text-white/80 hover:bg-white/10 transition-colors duration-200 border-l border-white/10"
                    >
                      Edit
                    </Link>
                    <button 
                      onClick={() => handleDeleteMaterial(material.id)}
                      className="flex-1 py-3 text-center text-red-400 hover:bg-red-500/10 transition-colors duration-200 border-l border-white/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
