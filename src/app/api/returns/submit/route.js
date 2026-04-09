import { processReturnRequest } from '@/services/returnService';

export async function POST(request) {
    try {
        const body = await request.json();
        const result = await processReturnRequest(body);
        
        if (!result.success) {
            return new Response(JSON.stringify(result), { status: 500 });
        }
        
        return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
}
