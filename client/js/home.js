var PLAN_ICONS = { payg: '\uD83D\uDD04', starter: '\uD83C\uDF31', business: '\uD83D\uDCC8', pro: '\uD83D\uDE80' };
var PLAN_COLORS = { payg: '#6b7280', starter: '#25D366', business: '#128C7E', pro: '#075E54' };

async function loadPlans() {
  try {
    var resp = await fetch('/api/subscription/plans');
    var data = await resp.json();
    if (!data.success || !data.plans) return;
    renderPlans(data.plans);
  } catch (e) {
    document.getElementById('plansGrid').innerHTML =
      '<div style="grid-column:1/-1;padding:40px;color:var(--text-muted);">Unable to load plans. Please refresh.</div>';
  }
}

function renderPlans(plans) {
  var grid = document.getElementById('plansGrid');
  grid.innerHTML = plans.map(function (plan) {
    var isHighlight = plan.highlight;
    var isFree      = plan.price === 0;
    var color       = PLAN_COLORS[plan.planKey] || '#25D366';
    var icon        = PLAN_ICONS[plan.planKey] || '\uD83D\uDCE6';
    var href        = '/register?plan=' + plan.planKey;

    var priceHtml = isFree
      ? '<div class="plan-price-free">Free</div><div class="plan-price-period">No monthly fee</div>'
      : '<div class="plan-price-amount"><span class="currency">R</span>' + plan.price + '</div>' +
        '<div class="plan-price-period">per month + ' + (plan.trialDays > 0 ? plan.trialDays + '-day free trial' : 'no trial') + '</div>';

    var productLimitText = plan.productLimit === -1 ? 'Unlimited' : plan.productLimit.toLocaleString();
    var customerLimitText = plan.customerLimit === -1 ? 'Unlimited' : plan.customerLimit.toLocaleString();

    var featuresHtml = (plan.featureLabels || []).slice(0, 6).map(function (f) {
      return '<li><span class="feat-check">&#10003;</span> ' + f + '</li>';
    }).join('');

    return '' +
      '<div class="plan-card ' + (isHighlight ? 'highlighted' : '') + ' pop-in">' +
        (plan.badge ? '<div class="plan-badge">' + plan.badge + '</div>' : '') +
        '<div class="plan-icon" style="background:' + color + '20;color:' + color + ';">' + icon + '</div>' +
        '<div class="plan-name">' + plan.name + '</div>' +
        '<div class="plan-tagline">' + plan.tagline + '</div>' +
        '<div class="plan-price">' + priceHtml + '</div>' +
        '<hr class="plan-divider">' +
        '<div class="plan-limits">' +
          '<div class="plan-limit-row">' +
            '<span class="limit-icon"><i data-lucide="package"></i></span>' +
            '<span><span class="plan-limit-value">' + productLimitText + '</span> products</span>' +
          '</div>' +
          '<div class="plan-limit-row">' +
            '<span class="limit-icon"><i data-lucide="users"></i></span>' +
            '<span><span class="plan-limit-value">' + customerLimitText + '</span> customers</span>' +
          '</div>' +
          '<div class="plan-limit-row">' +
            '<span class="limit-icon"><i data-lucide="message-circle"></i></span>' +
            '<span><span class="plan-limit-value">' + (plan.whatsappMessages ? plan.whatsappMessages.toLocaleString() : '0') + '</span> WhatsApp msgs/mo</span>' +
          '</div>' +
        '</div>' +
        '<div class="plan-fee-note">Transaction fee: <strong>' + plan.transactionFeePercent + '%</strong> per payment</div>' +
        '<ul class="plan-features">' + featuresHtml + '</ul>' +
        '<a href="' + href + '" class="btn-plan-select ' + (isHighlight ? 'btn-plan-primary' : 'btn-plan-outline') + '">' +
          (isFree ? 'Start Free' : ('Start ' + (plan.trialDays > 0 ? plan.trialDays + '-Day Trial' : 'Now'))) +
        '</a>' +
        (plan.trialDays > 0 ? '<div class="plan-trial-note">&#128274; No credit card required</div>' : '') +
      '</div>';
  }).join('');

  if (window.lucide) lucide.createIcons();
}

loadPlans();

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var el = document.querySelector(a.getAttribute('href'));
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
  });
});

if (window.lucide) lucide.createIcons();
