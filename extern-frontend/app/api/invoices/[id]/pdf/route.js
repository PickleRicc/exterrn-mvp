import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const craftsman_id = searchParams.get('craftsman_id');

    console.log(`API route: Requesting PDF for invoice ${id} with craftsman ID ${craftsman_id}`);

    if (!craftsman_id) {
      return NextResponse.json(
        { error: 'Craftsman ID is required' },
        { status: 400 }
      );
    }

    // Get the token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Build the backend API URL
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE || '';
    const apiUrl = `${apiBaseUrl}/invoices/${id}/pdf?craftsman_id=${craftsman_id}`;
    
    console.log(`Forwarding request to backend API: ${apiUrl}`);

    // Forward the request to the backend API
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      console.error(`Error from backend API: ${response.status} ${response.statusText}`);
      
      // Try to get error details if possible
      try {
        const errorData = await response.json();
        return NextResponse.json(
          { error: errorData.error || `API error: ${response.status}` },
          { status: response.status }
        );
      } catch (jsonError) {
        return NextResponse.json(
          { error: `API error: ${response.status}` },
          { status: response.status }
        );
      }
    }

    // Get the PDF data
    const pdfBuffer = await response.arrayBuffer();
    
    // Check if we got a valid PDF
    if (pdfBuffer.byteLength === 0) {
      console.error('Received empty PDF from backend API');
      return NextResponse.json(
        { error: 'Received empty PDF from backend API' },
        { status: 500 }
      );
    }
    
    console.log(`Successfully received PDF: ${pdfBuffer.byteLength} bytes`);

    // Return the PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice_${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error in PDF API route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
