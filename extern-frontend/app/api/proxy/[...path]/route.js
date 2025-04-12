import { NextResponse } from 'next/server';

// This is a simple API proxy that forwards requests to the backend
// It solves the mixed content issue by proxying HTTP requests through the HTTPS frontend
export async function GET(request, { params }) {
  // Get path from params without using Promise.resolve
  let path = '';
  if (params && params.path) {
    path = Array.isArray(params.path) ? params.path.join('/') : params.path;
  }
  
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
  
  const backendUrl = process.env.BACKEND_URL || 'http://3.127.139.32:3000';
  const response = await fetch(`${backendUrl}/${path}${queryString}`, {
    headers: {
      'Content-Type': 'application/json',
      // Forward authorization header if present
      ...(request.headers.get('authorization') 
          ? { 'Authorization': request.headers.get('authorization') } 
          : {})
    },
    cache: 'no-store'
  });

  // Handle different response types
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      const data = await response.json();
      return NextResponse.json(Array.isArray(data) ? data : (data || []));
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      return NextResponse.json([]);
    }
  } else {
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'text/plain'
      }
    });
  }
}

export async function POST(request, { params }) {
  // Get path from params without using Promise.resolve
  let path = '';
  if (params && params.path) {
    path = Array.isArray(params.path) ? params.path.join('/') : params.path;
  }
  
  const backendUrl = process.env.BACKEND_URL || 'http://3.127.139.32:3000';
  
  const body = await request.json();
  
  const response = await fetch(`${backendUrl}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(request.headers.get('authorization') 
          ? { 'Authorization': request.headers.get('authorization') } 
          : {})
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  return NextResponse.json(data);
}

export async function PUT(request, { params }) {
  // Get path from params without using Promise.resolve
  let path = '';
  if (params && params.path) {
    path = Array.isArray(params.path) ? params.path.join('/') : params.path;
  }
  
  const backendUrl = process.env.BACKEND_URL || 'http://3.127.139.32:3000';
  
  const body = await request.json();
  
  const response = await fetch(`${backendUrl}/${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(request.headers.get('authorization') 
          ? { 'Authorization': request.headers.get('authorization') } 
          : {})
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  // Get path from params without using Promise.resolve
  let path = '';
  if (params && params.path) {
    path = Array.isArray(params.path) ? params.path.join('/') : params.path;
  }
  
  const backendUrl = process.env.BACKEND_URL || 'http://3.127.139.32:3000';
  
  const response = await fetch(`${backendUrl}/${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(request.headers.get('authorization') 
          ? { 'Authorization': request.headers.get('authorization') } 
          : {})
    }
  });

  const data = await response.json();
  return NextResponse.json(data);
}
