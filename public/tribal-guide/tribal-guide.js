/* Tribal member discount & Washington sales tax guide page script (external file for the site CSP). */
(function () {
'use strict';

var FONT = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif';

function wrapLabel(label, maxLen) {
    maxLen = maxLen || 16;
    if (typeof label !== 'string' || label.length <= maxLen) {
        return label;
    }
    var words = label.split(' ');
    var lines = [];
    var currentLine = '';
    for (var i = 0; i < words.length; i++) {
        var word = words[i];
        if (currentLine.length === 0) {
            currentLine = word;
        } else if (currentLine.length + 1 + word.length <= maxLen) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }
    return lines;
}

// ---- Example pricing chart (example prices, before tax) ----
var skuLabels = [
    'Screen Repair (example $180)',
    'Battery Repair (example $100)',
    'Phone Case (Accessory, example $30)',
    'Trip Fee ($25)',
    'Mail-In Kit ($40)',
    'IT Service (example $130)'
].map(function (l) { return wrapLabel(l, 16); });

var pricingCanvas = document.getElementById('skuPricingChart');
if (pricingCanvas && window.Chart) {
    new window.Chart(pricingCanvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: skuLabels,
            datasets: [
                {
                    label: 'Approved member: 20% off repairs & accessories (example prices, before tax)',
                    data: [144.00, 80.00, 24.00, 25.00, 40.00, 130.00],
                    backgroundColor: '#2563EB',
                    borderRadius: 4
                },
                {
                    label: 'Regular price (example prices, before tax)',
                    data: [180.00, 100.00, 30.00, 25.00, 40.00, 130.00],
                    backgroundColor: '#94A3B8',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#0F172A', font: { family: FONT, size: 11, weight: '600' } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: '#E2E8F0' },
                    ticks: {
                        color: '#475569',
                        font: { family: FONT, size: 11 },
                        callback: function (val) { return '$' + val; }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#1E293B', font: { family: FONT, size: 11, weight: '600' } }
                },
                tooltip: {
                    callbacks: {
                        title: function (items) {
                            var label = items[0].chart.data.labels[items[0].dataIndex];
                            return Array.isArray(label) ? label.join(' ') : label;
                        },
                        label: function (ctx) {
                            return ' ' + ctx.dataset.label.split(':')[0].split(' (')[0] + ': $' + ctx.parsed.y.toFixed(2) + ' (example)';
                        }
                    }
                }
            }
        }
    });
}

// ---- How it works today: step details ----
var pipelineStages = [
    {
        badge: 'STEP 1',
        title: 'Shopify Account & Checkout',
        endpoint: 'Shopify checkout',
        problem: 'You shop and check out on displaycellpros.com, and payment runs through our Shopify store\'s checkout.',
        solution: 'Use the same customer account each time you order, so your approved member discount follows your account.'
    },
    {
        badge: 'STEP 2',
        title: 'Membership Reviewed by Our Staff',
        endpoint: 'Manual review',
        problem: 'Send us your photo ID and proof of tribal membership. A person on our team reviews them by hand; there is no automated ID check.',
        solution: 'We let you know when your membership is approved or if we need anything else.'
    },
    {
        badge: 'STEP 3',
        title: 'Fixed 20% Off Repairs and Accessories',
        endpoint: 'Customer account tag',
        problem: 'Once you\'re approved, we add a tag to your customer account. The tag applies a fixed 20% discount to the full price of all repairs and accessories.',
        solution: 'The 20% does not apply to the $25 trip fee, the $40 mail-in kit, shipping, or IT services. Sales tax is still charged at checkout.'
    },
    {
        badge: 'STEP 4',
        title: 'Your ID Documents',
        endpoint: 'Staff review',
        problem: 'Your ID documents are reviewed by a person on our team and stored securely.',
        solution: 'Questions about your documents? Contact us.'
    }
];

var pipelineNodes = document.querySelectorAll('.pipeline-node');
pipelineNodes.forEach(function (btn) {
    btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-stage'), 10);
        pipelineNodes.forEach(function (n) {
            n.classList.remove('border-blue-600', 'bg-blue-50/70');
            n.classList.add('border-slate-200', 'bg-slate-50');
        });
        btn.classList.remove('border-slate-200', 'bg-slate-50');
        btn.classList.add('border-blue-600', 'bg-blue-50/70');

        var data = pipelineStages[idx];
        document.getElementById('stageBadge').textContent = data.badge;
        document.getElementById('stageTitle').textContent = data.title;
        document.getElementById('stageEndpoint').textContent = data.endpoint;
        document.getElementById('stageProblem').textContent = data.problem;
        document.getElementById('stageSolution').textContent = data.solution;
    });
});

// ---- Checkout examples ----
var simVerifiedEl = document.getElementById('simVerified');
var simOnResEl = document.getElementById('simOnRes');
var simJurisdictionEl = document.getElementById('simJurisdiction');

var TAG = 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ';
var DISCOUNT_ON = '20% off repairs and accessories';
var DISCOUNT_ON_DETAIL = 'Applied to the full price through the tag on your customer account. It does not apply to the $25 trip fee, the $40 mail-in kit, shipping, or IT services.';

function updateSimulator() {
    var verified = simVerifiedEl.checked;
    var onRes = simOnResEl.checked;
    var jur = simJurisdictionEl.value;
    simJurisdictionEl.disabled = !onRes;

    var tagEl = document.getElementById('simScenarioTag');
    var titleEl = document.getElementById('simScenarioTitle');
    var t1ResEl = document.getElementById('simTrack1Result');
    var t1DetEl = document.getElementById('simTrack1Detail');
    var t2ResEl = document.getElementById('simTrack2Result');
    var t2DetEl = document.getElementById('simTrack2Detail');
    var auditEl = document.getElementById('simAuditDetail');
    var payloadEl = document.getElementById('simCheckoutLine');

    if (verified) {
        t1ResEl.className = 'text-lg font-extrabold text-amber-300 mt-1';
        t1ResEl.textContent = DISCOUNT_ON;
        t1DetEl.textContent = DISCOUNT_ON_DETAIL;
        payloadEl.textContent = 'At checkout: 20% off repairs and accessories; sales tax charged';
    } else {
        t1ResEl.className = 'text-lg font-extrabold text-slate-300 mt-1';
        t1ResEl.textContent = 'No member discount';
        t1DetEl.textContent = 'Regular prices apply until your membership is approved by our staff.';
        payloadEl.textContent = 'At checkout: regular prices; sales tax charged';
    }

    t2ResEl.className = 'text-lg font-extrabold text-rose-400 mt-1';
    t2ResEl.textContent = 'Sales tax charged';

    if (verified && onRes && jur === 'WA_SAME') {
        tagEl.className = TAG + 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30';
        tagEl.textContent = 'DISCOUNT + POSSIBLE TAX REFUND';
        titleEl.textContent = 'Approved Member + Delivery Within Your Own Tribe\'s Reservation';
        t2ResEl.className = 'text-lg font-extrabold text-emerald-400 mt-1';
        t2ResEl.textContent = 'Tax charged; refund possible after we confirm eligibility';
        t2DetEl.textContent = 'Sales tax is charged at checkout. If you are enrolled with the tribe whose reservation receives the delivery, you may qualify for a refund of the tax.';
        auditEl.textContent = 'Contact us before or after you order. We\'ll confirm eligibility, collect the required Washington exemption form, and refund the tax if your order qualifies.';
    } else if (verified && onRes) {
        tagEl.className = TAG + 'bg-amber-500/20 text-amber-300 border border-amber-400/30';
        tagEl.textContent = 'DISCOUNT ONLY';
        titleEl.textContent = 'Approved Member + Delivery to Another Tribe\'s Reservation';
        t2DetEl.textContent = 'Washington generally requires enrollment with the tribe whose reservation receives the delivery, so a tax refund generally does not apply.';
        auditEl.textContent = 'Your 20% member discount still applies. Contact us if you have questions about your situation.';
    } else if (verified) {
        tagEl.className = TAG + 'bg-blue-500/20 text-blue-300 border border-blue-400/30';
        tagEl.textContent = 'DISCOUNT ONLY';
        titleEl.textContent = 'Approved Member + Delivery Off the Reservation';
        t2DetEl.textContent = 'The Washington exemption generally applies only to deliveries within the member\'s own tribe\'s reservation.';
        auditEl.textContent = 'Your 20% member discount applies wherever we ship. Standard sales tax applies.';
    } else if (onRes) {
        tagEl.className = TAG + 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30';
        tagEl.textContent = 'NOT YET APPROVED';
        titleEl.textContent = 'Membership Not Yet Approved + Reservation Delivery';
        t2DetEl.textContent = 'Delivery to a reservation alone generally does not make an order tax exempt.';
        auditEl.textContent = 'If you are an enrolled tribal member, contact us to have your membership reviewed by our staff.';
    } else {
        tagEl.className = TAG + 'bg-slate-600/40 text-slate-300 border border-slate-500/40';
        tagEl.textContent = 'STANDARD ORDER';
        titleEl.textContent = 'Standard Customer + Delivery Off the Reservation';
        t2DetEl.textContent = 'Standard sales tax is charged at checkout.';
        auditEl.textContent = 'Regular prices and standard sales tax apply.';
    }
}

if (simVerifiedEl && simOnResEl && simJurisdictionEl) {
    simVerifiedEl.addEventListener('change', updateSimulator);
    simOnResEl.addEventListener('change', updateSimulator);
    simJurisdictionEl.addEventListener('change', updateSimulator);
    updateSimulator();
}

// ---- Active nav link on scroll ----
var navLinks = document.querySelectorAll('.nav-link');
var sections = document.querySelectorAll('main section[id]');
window.addEventListener('scroll', function () {
    var current = '';
    sections.forEach(function (sec) {
        if (window.scrollY >= sec.offsetTop - 120) {
            current = sec.getAttribute('id');
        }
    });
    navLinks.forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
});
})();
