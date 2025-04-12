import { NextResponse } from 'next/server';

// This is a simple API proxy that forwards requests to the backend
export async function GET(request) {
  try {
    // Extract path from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/api/proxy/');
    const path = pathSegments.length > 1 ? pathSegments[1] : '';
    
    const searchParams = url.searchParams;
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    
    const backendUrl = process.env.BACKEND_URL || 'http://3.127.139.32:3000';
    const fullUrl = `${backendUrl}/${path}${queryString}`;
    
    console.log(`Proxying GET request to: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
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
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Extract path from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/api/proxy/');
    const path = pathSegments.length > 1 ? pathSegments[1] : '';
    
    const backendUrl = process.env.BACKEND_URL || 'http://3.127.139.32:3000';
    const fullUrl = `${backendUrl}/${path}`;
    
    console.log(`Proxying POST request to: ${fullUrl}`);
    
    const body = await request.json();
    
    const response = await fetch(fullUrl, {
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
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    // Extract path from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/api/proxy/');
    const path = pathSegments.length > 1 ? pathSegments[1] : '';
    
    const backendUrl = process.env.BACKEND_URL || 'http://3.127.139.32:3000';
    const fullUrl = `${backendUrl}/${path}`;
    
    console.log(`Proxying PUT request to: ${fullUrl}`);
    
    const body = await request.json();
    
    const response = await fetch(fullUrl, {
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
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    // Extract path from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/api/proxy/');
    const path = pathSegments.length > 1 ? pathSegments[1] : '';
    
    const backendUrl = process.env.BACKEND_URL || 'http://3.127.139.32:3000';
    const fullUrl = `${backendUrl}/${path}`;
    
    console.log(`Proxying DELETE request to: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
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
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}
