import { NextResponse } from 'next/server';

// Configure this route as dynamic to fix the static export error
export const dynamic = 'force-dynamic';

// This is a simple API proxy that forwards requests to the backend
export async function GET(request) {
  try {
    // Extract path from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/api/proxy/');
    const path = pathSegments.length > 1 ? pathSegments[1] : '';
    
    const searchParams = url.searchParams;
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    
    const backendUrl = process.env.BACKEND_URL || 'http://63.178.22.180:3000';
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
    
    const backendUrl = process.env.BACKEND_URL || 'http://63.178.22.180:3000';
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

    // Handle different response types
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await response.json();
        return NextResponse.json(data);
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        return NextResponse.json({ error: 'Invalid JSON response from server' }, { status: response.status });
      }
    } else {
      // Handle non-JSON responses (like HTML error pages)
      const text = await response.text();
      console.error('Received non-JSON response:', text.substring(0, 200) + '...');
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

export async function PUT(request) {
  try {
    // Extract path from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/api/proxy/');
    const path = pathSegments.length > 1 ? pathSegments[1] : '';
    
    const backendUrl = process.env.BACKEND_URL || 'http://63.178.22.180:3000';
    const fullUrl = `${backendUrl}/${path}`;
    
    console.log(`Proxying PUT request to: ${fullUrl}`);
    
    // Check if there's a body before trying to parse it
    let body;
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const text = await request.text();
        body = text ? JSON.parse(text) : undefined;
      } catch (error) {
        console.error('Error parsing request body:', error);
        body = undefined;
      }
    }
    
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') 
            ? { 'Authorization': request.headers.get('authorization') } 
            : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    // Handle different response types
    const responseContentType = response.headers.get('content-type');
    if (responseContentType && responseContentType.includes('application/json')) {
      try {
        const data = await response.json();
        return NextResponse.json(data);
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        return NextResponse.json({ error: 'Invalid JSON response from server' }, { status: response.status });
      }
    } else {
      // Handle non-JSON responses (like HTML error pages)
      const text = await response.text();
      console.error('Received non-JSON response:', text.substring(0, 200) + '...');
      return new NextResponse(text, {
        status: response.status,
        headers: {
          'Content-Type': responseContentType || 'text/plain'
        }
      });
    }
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
    
    // Handle query params - important for DELETE requests
    const searchParams = url.searchParams;
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    
    // Log all query parameters for debugging
    console.log('DELETE request query parameters:');
    searchParams.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    const backendUrl = process.env.BACKEND_URL || 'http://63.178.22.180:3000';
    const fullUrl = `${backendUrl}/${path}${queryString}`;
    
    console.log(`Proxying DELETE request to: ${fullUrl}`);
    
    // DELETE requests typically don't have bodies, but handle it just in case
    let body;
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const text = await request.text();
        body = text ? JSON.parse(text) : undefined;
      } catch (error) {
        console.error('Error parsing request body:', error);
        body = undefined;
      }
    }
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') 
            ? { 'Authorization': request.headers.get('authorization') } 
            : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    // Handle different response types
    const responseContentType = response.headers.get('content-type');
    if (responseContentType && responseContentType.includes('application/json')) {
      try {
        const data = await response.json();
        return NextResponse.json(data);
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        return NextResponse.json({ error: 'Invalid JSON response from server' }, { status: response.status });
      }
    } else {
      // Handle non-JSON responses (like HTML error pages)
      const text = await response.text();
      console.error('Received non-JSON response:', text.substring(0, 200) + '...');
      return new NextResponse(text, {
        status: response.status,
        headers: {
          'Content-Type': responseContentType || 'text/plain'
        }
      });
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}
