import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Extract invoice ID and craftsman ID from URL
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const craftsman_id = url.searchParams.get('craftsman_id');
    
    if (!id || !craftsman_id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Get the authorization header from the request cookies or headers
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Forward the request to the backend
    const backendUrl = process.env.BACKEND_URL || 'http://3.127.139.32:3000';
    const fullUrl = `${backendUrl}/invoices/${id}/pdf?craftsman_id=${craftsman_id}`;
    
    console.log(`Forwarding PDF download request to: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from backend: ${errorText}`);
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: response.status });
    }
    
    // Get the PDF content
    const pdfBuffer = await response.arrayBuffer();
    
    // Return the PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice_${id}.pdf"`,
      }
    });
  } catch (error) {
    console.error('PDF download error:', error);
    return NextResponse.json({ error: 'PDF download failed' }, { status: 500 });
  }
}
