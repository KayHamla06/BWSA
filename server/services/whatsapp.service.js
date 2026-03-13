import axios from 'axios';

function getConfig() {
  return {
    phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    token: process.env.WHATSAPP_API_TOKEN,
    version: process.env.WHATSAPP_API_VERSION || 'v20.0',
    baseURL: `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v20.0'}`,
  };
}

export function isConfigured() {
  const { phoneId, token } = getConfig();
  return Boolean(phoneId && token);
}

async function sendRequest(payload) {
  const { phoneId, token, baseURL } = getConfig();
  return axios.post(`${baseURL}/${phoneId}/messages`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });
}

export async function sendTextMessage(toPhone, body) {
  if (!isConfigured()) {
    return { success: false, message: 'WhatsApp not configured' };
  }
  const to = String(toPhone).replace(/^\+/, '').replace(/\s/g, '');
  try {
    await sendRequest({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    });
    return { success: true };
  } catch (error) {
    console.error('WhatsApp send failed:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

export async function sendProductMenu(toPhone, products, businessName) {
  if (!isConfigured()) return { success: false, message: 'WhatsApp not configured' };
  const to = String(toPhone).replace(/^\+/, '').replace(/\s/g, '');

  const rows = products.slice(0, 10).map((p) => ({
    id: `product_${p._id.toString()}`,
    title: p.name.substring(0, 24),
    description: `R${p.price.toFixed(2)} | ${p.stock > 0 ? 'In Stock' : 'Out of Stock'}`.substring(0, 72),
  }));

  try {
    await sendRequest({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: { type: 'text', text: `${businessName} - Shop` },
        body: { text: '📦 *Our Products*\n\nSelect a product to view details:' },
        footer: { text: 'Reply "help" for assistance' },
        action: {
          button: 'View Products',
          sections: [{ title: 'Available Products', rows }],
        },
      },
    });
    return { success: true };
  } catch (error) {
    console.error('WhatsApp product menu failed:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

export async function sendProductDetails(toPhone, product) {
  if (!isConfigured()) return { success: false, message: 'WhatsApp not configured' };
  const to = String(toPhone).replace(/^\+/, '').replace(/\s/g, '');

  const text = `*${product.name}*\n━━━━━━━━━━━━━━━\n📝 ${product.description || 'Premium quality product'}\n\n💰 *Price:* R${product.price.toFixed(2)}\n📦 *In Stock:* ${product.stock > 0 ? '✅ Yes' : '❌ No'}`;

  const buttons = [];
  if (product.stock > 0) {
    buttons.push({ type: 'reply', reply: { id: `buy_${product._id}`, title: '🛒 Buy Now' } });
  }
  buttons.push({ type: 'reply', reply: { id: 'view_menu', title: '📦 Back to Menu' } });

  try {
    // Send image if available
    if (product.image_url) {
      await sendRequest({
        messaging_product: 'whatsapp',
        to,
        type: 'image',
        image: { link: product.image_url, caption: `${product.name} - R${product.price.toFixed(2)}` },
      });
    }

    await sendRequest({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text },
        action: { buttons },
      },
    });
    return { success: true };
  } catch (error) {
    console.error('WhatsApp product details failed:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

export async function sendPaymentLink(toPhone, productName, amount, paymentUrl) {
  const message = `🛍️ *Order Confirmation*\n━━━━━━━━━━━━━━━\n\nProduct: *${productName}*\nPrice: *R${Number(amount).toFixed(2)}*\n\nClick below to pay securely:\n${paymentUrl}\n\n💳 Powered by Ozow`;
  return sendTextMessage(toPhone, message);
}

export async function sendPaymentConfirmation(toPhone, amount, reference) {
  const message = `✅ *Payment Successful!*\n━━━━━━━━━━━━━━━\n\nAmount: R${Number(amount).toFixed(2)}\nReference: ${reference}\n\nThank you for your purchase! 🎉`;
  return sendTextMessage(toPhone, message);
}

export const whatsappService = {
  isConfigured,
  sendTextMessage,
  sendProductMenu,
  sendProductDetails,
  sendPaymentLink,
  sendPaymentConfirmation,
};
