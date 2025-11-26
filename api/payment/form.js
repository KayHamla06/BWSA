// api/payment/form.js
export default function handler(req, res) {
  const { amount, ref, customerPhone } = req.query;

  if (!amount || !ref || !customerPhone) {
    return res.status(400).send("Missing payment details");
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Pay R${amount}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f9f9f9; margin:0; padding:20px; }
    .card { background:white; max-width:380px; margin:40px auto; border-radius:16px; padding:30px; box-shadow:0 10px 30px rgba(0,0,0,0.1); text-align:center; }
    h2 { margin:0 0 10px; color:#111; }
    .ref { color:#666; font-size:14px; margin:10px 0 20px; }
    input, button { width:100%; padding:16px; margin:10px 0; border-radius:12px; border:1px solid #ddd; font-size:16px; }
    button { background:#00d25b; color:white; border:none; font-weight:bold; cursor:pointer; }
    small { color:#888; font-size:12px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Pay R${amount}</h2>
    <div class="ref">Reference: ${ref}</div>
    <form action="/api/payment/initiate" method="POST">
      <input type="hidden" name="amount" value="${amount}" />
      <input type="hidden" name="ref" value="${ref}" />
      <input type="hidden" name="customerPhone" value="${customerPhone}" />
      <input type="tel" name="shapId" placeholder="082 123 4567" required />
      <button type="submit">Pay with PayShap</button>
    </form>
    <small>Your bank app will open to approve</small>
  </div>
</body>
</html>
  `;

  res.send(html);
}