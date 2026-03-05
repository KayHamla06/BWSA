import { ozowService } from '@/services/ozow';
import { whatsappService } from '@/services/whatsapp';

export async function GET(request) {
  const ozowConfigured = ozowService.isConfigured();
  const whatsappConfigured = whatsappService.isConfigured();

  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      ozow: {
        available: ozowConfigured,
        status: ozowConfigured ? 'configured' : 'not_configured',
        message: ozowConfigured 
          ? 'Ozow payment service is ready' 
          : 'Ozow payment service is NOT available - add OZOW_SITE_CODE and OZOW_PRIVATE_KEY to .env.local'
      },
      whatsapp: {
        available: whatsappConfigured,
        status: whatsappConfigured ? 'configured' : 'not_configured',
        message: whatsappConfigured 
          ? 'WhatsApp messaging service is ready' 
          : 'WhatsApp messaging service is NOT available - add WHATSAPP_PHONE_ID and WHATSAPP_TOKEN to .env.local'
      }
    },
    summary: {
      configuredServices: [
        ozowConfigured && 'ozow',
        whatsappConfigured && 'whatsapp'
      ].filter(Boolean),
      unavailableServices: [
        !ozowConfigured && 'ozow',
        !whatsappConfigured && 'whatsapp'
      ].filter(Boolean)
    }
  });
}
