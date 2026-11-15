/* Tribal verification guide page script (moved out of inline <script> for the site CSP). */
(function () {
'use strict';
        function wrapLabel(label, maxLen = 16) {
            if (typeof label !== 'string' || label.length <= maxLen) {
                return label;
            }
            const words = label.split(' ');
            const lines = [];
            let currentLine = '';
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
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

        const sharedTooltipConfig = {
            callbacks: {
                title: function(tooltipItems) {
                    const item = tooltipItems[0];
                    let label = item.chart.data.labels[item.dataIndex];
                    if (Array.isArray(label)) {
                        return label.join(' ');
                    } else {
                        return label;
                    }
                }
            }
        };

        const credentialLabels = [
            'Standard Tribal ID Cards & Official Enrollment Letters',
            'WHTI Enhanced Tribal Cards with RFID & MRZ'
        ].map(l => wrapLabel(l, 16));

        new Chart(document.getElementById('credentialLandscapeChart').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: credentialLabels,
                datasets: [{
                    data: [561, 14],
                    backgroundColor: ['#2563EB', '#06B6D4'],
                    borderColor: '#FFFFFF',
                    borderWidth: 3,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#334155',
                            font: { family: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif", size: 12, weight: '600' },
                            padding: 16
                        }
                    },
                    tooltip: {
                        ...sharedTooltipConfig,
                        callbacks: {
                            ...sharedTooltipConfig.callbacks,
                            label: function(ctx) {
                                const val = ctx.parsed;
                                const pct = ((val / 575) * 100).toFixed(1);
                                return ' ' + val + ' Tribes (' + pct + '% of 575 BIA Entities)';
                            }
                        }
                    }
                }
            }
        });

        const retentionLabels = [
            'Raw GovID & Tribal Images (Post-Review Purge)',
            'CA On-Reservation Primary Use-Tax Window',
            'WA Tax Certificates & Carrier POD Audit Vault'
        ].map(l => wrapLabel(l, 16));

        new Chart(document.getElementById('retentionLifecycleChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: retentionLabels,
                datasets: [{
                    label: 'Retention Duration (Months)',
                    data: [0.03, 12, 60],
                    backgroundColor: ['#F43F5E', '#F59E0B', '#10B981'],
                    borderRadius: 6,
                    minBarLength: 10
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 66,
                        grid: { color: '#E2E8F0' },
                        ticks: {
                            color: '#475569',
                            font: { family: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif", size: 11 },
                            callback: function(value) { return value + ' mo'; }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: '#0F172A',
                            font: { family: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif", size: 11, weight: '600' }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        ...sharedTooltipConfig,
                        callbacks: {
                            ...sharedTooltipConfig.callbacks,
                            label: function(ctx) {
                                const v = ctx.parsed.x;
                                if (v < 1) return ' <= 24 Hours (Immediate DELETE API Redaction)';
                                return ' ' + v + ' Months (' + (v / 12) + ' Years Statutory Window)';
                            }
                        }
                    }
                }
            }
        });

        const skuLabels = [
            'Replacement Battery ($100 Part)',
            'Display Assembly ($180 Part)',
            'Technician Toolkit ($80 Gear)',
            'On-Site Dispatch Fee ($25 Fee)',
            'Mail-In Diagnostic ($40 Fee)',
            'Software Repair Service ($130 IT)'
        ].map(l => wrapLabel(l, 16));

        new Chart(document.getElementById('skuPricingChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: skuLabels,
                datasets: [
                    {
                        label: 'Scenario 1: Enrolled + On-Res (20% Goods Off, 0% Tax)',
                        data: [80.00, 144.00, 64.00, 25.00, 40.00, 130.00],
                        backgroundColor: '#10B981',
                        borderRadius: 4
                    },
                    {
                        label: 'Scenario 2: Enrolled + Off-Res (20% Goods Off, 8.5% Tax)',
                        data: [86.80, 156.24, 69.44, 27.13, 43.40, 141.05],
                        backgroundColor: '#2563EB',
                        borderRadius: 4
                    },
                    {
                        label: 'Scenario 4: Standard Retail (0% Discount, 8.5% Tax)',
                        data: [108.50, 195.30, 86.80, 27.13, 43.40, 141.05],
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
                        ticks: {
                            color: '#0F172A',
                            font: { family: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif", size: 11, weight: '600' }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#E2E8F0' },
                        ticks: {
                            color: '#475569',
                            font: { family: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif", size: 11 },
                            callback: function(val) { return '$' + val; }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#1E293B',
                            font: { family: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif", size: 11, weight: '600' }
                        }
                    },
                    tooltip: {
                        ...sharedTooltipConfig,
                        callbacks: {
                            ...sharedTooltipConfig.callbacks,
                            label: function(ctx) {
                                return ' ' + ctx.dataset.label.split(':')[0] + ': $' + ctx.parsed.y.toFixed(2);
                            }
                        }
                    }
                }
            }
        });

        const roadmapLabels = [
            'Phase 1: Relational GIS & 575 BIA Seed',
            'Phase 2: KYC Doc AI & Manual Case Gate',
            'Phase 3: Catalog Exclusions & Tax Rules',
            'Phase 4: Identity Storefront & Cart Sync',
            'Phase 5: Scenario 1-4 Compliance QA'
        ].map(l => wrapLabel(l, 16));

        new Chart(document.getElementById('roadmapGanttChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: roadmapLabels,
                datasets: [{
                    label: 'Reference Sprint Window (Weeks 1 to 11)',
                    data: [
                        [0, 2],
                        [2, 5],
                        [4, 7],
                        [6, 9],
                        [8, 11]
                    ],
                    backgroundColor: ['#2563EB', '#06B6D4', '#F59E0B', '#4F46E5', '#10B981'],
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        min: 0,
                        max: 11,
                        grid: { color: '#E2E8F0' },
                        ticks: {
                            stepSize: 1,
                            color: '#475569',
                            font: { family: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif", size: 11 },
                            callback: function(val) {
                                if (val === 0) return 'Start';
                                return 'Wk ' + val;
                            }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: '#0F172A',
                            font: { family: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif", size: 11, weight: '600' }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        ...sharedTooltipConfig,
                        callbacks: {
                            ...sharedTooltipConfig.callbacks,
                            label: function(ctx) {
                                const range = ctx.raw;
                                return ' Reference Window: Week ' + (range[0] + 1) + ' through Week ' + range[1];
                            }
                        }
                    }
                }
            }
        });

        const pipelineStages = [
            {
                badge: 'STAGE 1 ARCHITECTURAL PATTERN',
                title: 'Unified Customer Identity & Reference ID Synchronization',
                endpoint: 'Canonical Customer UUID',
                problem: 'Multi-surface e-commerce stacks often separate customer authentication portals from hosted checkout sessions. Launching a KYC flow without a unified reference identifier creates orphaned or duplicate verification records.',
                solution: 'Resolve a single canonical customer UUID upon authentication and pass it as the KYC provider\'s reference-id while synchronizing storefront and payment processor customer tokens.'
            },
            {
                badge: 'STAGE 2 ARCHITECTURAL PATTERN',
                title: 'Two-Step KYC Inquiry, Manual Case Gate & PII Redaction',
                endpoint: 'DELETE /api/v1/verifications/:id',
                problem: 'Standard KYC tribalid classes often apply solely to Canadian Tribal IDs, and compliance policies frequently mandate human verification before privileges activate.',
                solution: 'Combine US GovID verification with Custom Document AI extraction and automated name-match comparison, route to a manual Case queue for authorized reviewer sign-off, log a salted SHA-256 hash, and immediately redact raw IDs.'
            },
            {
                badge: 'STAGE 3 ARCHITECTURAL PATTERN',
                title: 'PostGIS Spatial Boundary & State Statutory Rule Evaluation',
                endpoint: 'ST_Contains(aiana.geom, point)',
                problem: '5-digit ZIP codes straddle reservation borders, and Washington (same-tribe nexus), California (on-res residency + FOB clause), and Arizona (local intake situs) enforce incompatible exemption rules.',
                solution: 'Geocode the normalized shipping address, run PostGIS ST_Contains against U.S. Census AIANA polygons, and evaluate state statutory rules before initializing the checkout session.'
            },
            {
                badge: 'STAGE 4 ARCHITECTURAL PATTERN',
                title: 'Stripe Checkout Session Coupon Injection & Tax Gate',
                endpoint: 'POST /v1/checkout/sessions',
                problem: 'Native checkout tax customer exemptions operate at the state level, store zero certificates, and would wrongly exempt off-reservation orders in Scenario 2.',
                solution: 'Keep customer tax status at Taxable; inject a 20% Coupon restricted via applies_to to eligible goods when citizenship is verified; disable automatic_tax solely when Scenario 1 passes all GIS and certificate checks.'
            }
        ];

        const pipelineNodes = document.querySelectorAll('.pipeline-node');
        pipelineNodes.forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-stage'), 10);
                pipelineNodes.forEach(n => {
                    n.classList.remove('border-blue-600', 'bg-blue-50/70');
                    n.classList.add('border-slate-200', 'bg-slate-50');
                });
                btn.classList.remove('border-slate-200', 'bg-slate-50');
                btn.classList.add('border-blue-600', 'bg-blue-50/70');

                const data = pipelineStages[idx];
                document.getElementById('stageBadge').textContent = data.badge;
                document.getElementById('stageTitle').textContent = data.title;
                document.getElementById('stageEndpoint').textContent = data.endpoint;
                document.getElementById('stageProblem').textContent = data.problem;
                document.getElementById('stageSolution').textContent = data.solution;
            });
        });

        const schemaFilterBtns = document.querySelectorAll('.schema-filter-btn');
        const schemaCards = document.querySelectorAll('.schema-card');
        schemaFilterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tier = btn.getAttribute('data-tier');
                schemaFilterBtns.forEach(b => {
                    b.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
                    b.classList.add('bg-white', 'text-slate-700', 'border', 'border-slate-300');
                });
                btn.classList.remove('bg-white', 'text-slate-700', 'border', 'border-slate-300');
                btn.classList.add('bg-blue-600', 'text-white', 'shadow-sm');

                schemaCards.forEach(card => {
                    if (tier === 'ALL' || card.getAttribute('data-tier') === tier) {
                        card.classList.remove('hidden');
                    } else {
                        card.classList.add('hidden');
                    }
                });
            });
        });

        const simVerifiedEl = document.getElementById('simVerified');
        const simOnResEl = document.getElementById('simOnRes');
        const simJurisdictionEl = document.getElementById('simJurisdiction');

        function updateSimulator() {
            const verified = simVerifiedEl.checked;
            const onRes = simOnResEl.checked;
            const jur = simJurisdictionEl.value;

            const tagEl = document.getElementById('simScenarioTag');
            const titleEl = document.getElementById('simScenarioTitle');
            const t1ResEl = document.getElementById('simTrack1Result');
            const t1DetEl = document.getElementById('simTrack1Detail');
            const t2ResEl = document.getElementById('simTrack2Result');
            const t2DetEl = document.getElementById('simTrack2Detail');
            const auditEl = document.getElementById('simAuditDetail');
            const payloadEl = document.getElementById('simStripePayload');

            if (verified && onRes) {
                if (jur === 'WA_SAME') {
                    tagEl.className = 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30';
                    tagEl.textContent = 'SCENARIO 1: FULL PRIVILEGES';
                    titleEl.textContent = 'Enrolled Member + WA Same-Tribe Reservation Delivery';
                    t1ResEl.className = 'text-lg font-extrabold text-amber-300 mt-1';
                    t1ResEl.textContent = 'ACTIVE (20% Off Eligible Goods)';
                    t1DetEl.textContent = 'Injects Stripe Coupon via discounts array; applies_to excludes dispatch, diagnostic, and shipping fees.';
                    t2ResEl.className = 'text-lg font-extrabold text-emerald-400 mt-1';
                    t2ResEl.textContent = '0% TAX (Entity Code C)';
                    t2DetEl.textContent = 'Same-tribe territory confirmed under WAC 458-20-192; automatic_tax disabled for this session.';
                    auditEl.textContent = 'Capture signed Washington Buyers\' Retail Sales Tax Exemption Certificate (Line 4a), record tribal affiliation & delivery reservation, and retain carrier POD for 5 years.';
                    payloadEl.textContent = 'Stripe: { discounts: [{ coupon: "TRIBAL_20" }], automatic_tax: { enabled: false } }';
                } else if (jur === 'CA_HOOPA') {
                    tagEl.className = 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30';
                    tagEl.textContent = 'SCENARIO 1: FULL PRIVILEGES';
                    titleEl.textContent = 'DOI-Eligible Native American + Hoopa Valley Delivery';
                    t1ResEl.className = 'text-lg font-extrabold text-amber-300 mt-1';
                    t1ResEl.textContent = 'ACTIVE (20% Off Eligible Goods)';
                    t1DetEl.textContent = 'Injects Stripe Coupon via discounts array; applies_to protects operational fees and labor.';
                    t2ResEl.className = 'text-lg font-extrabold text-emerald-400 mt-1';
                    t2ResEl.textContent = '0% TAX (Entity Code C)';
                    t2DetEl.textContent = 'CA CDTFA Reg 1616 satisfied: on-reservation residency verified & title passes upon reservation delivery.';
                    auditEl.textContent = 'Vault signed Form CDTFA-146-RES, print "FOB Hoopa Valley Indian Reservation" + 12-mo >50% use-tax notice on invoice, and retain common carrier POD.';
                    payloadEl.textContent = 'Stripe: { discounts: [{ coupon: "TRIBAL_20" }], automatic_tax: { enabled: false } }';
                } else if (jur === 'WA_CROSS') {
                    tagEl.className = 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30';
                    tagEl.textContent = 'SCENARIO 1 BLOCKED -> TAX COLLECTED';
                    titleEl.textContent = 'WA Cross-Tribe Delivery (Tribe A Member on Tribe B Land)';
                    t1ResEl.className = 'text-lg font-extrabold text-amber-300 mt-1';
                    t1ResEl.textContent = 'ACTIVE (20% Off Eligible Goods)';
                    t1DetEl.textContent = 'Track 1 commercial discount remains active regardless of which reservation receives shipment.';
                    t2ResEl.className = 'text-lg font-extrabold text-rose-400 mt-1';
                    t2ResEl.textContent = 'FULL WA SALES TAX COLLECTED';
                    t2DetEl.textContent = 'WAC 458-20-192 requires enrollment with the tribe upon whose territory delivery occurs; auto_exempt blocked.';
                    auditEl.textContent = 'Log cross-tribe territory mismatch in checkout compliance evaluations and collect standard Washington state/local sales tax via Stripe automatic_tax.';
                    payloadEl.textContent = 'Stripe: { discounts: [{ coupon: "TRIBAL_20" }], automatic_tax: { enabled: true } }';
                } else {
                    tagEl.className = 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30';
                    tagEl.textContent = 'SCENARIO 1 HELD -> CPA SITUS GATE';
                    titleEl.textContent = 'Arizona On-Reservation Delivery (Out-of-State Online Order)';
                    t1ResEl.className = 'text-lg font-extrabold text-amber-300 mt-1';
                    t1ResEl.textContent = 'ACTIVE (20% Off Eligible Goods)';
                    t1DetEl.textContent = 'Track 1 commercial discount applies automatically via Stripe Coupon.';
                    t2ResEl.className = 'text-lg font-extrabold text-rose-400 mt-1';
                    t2ResEl.textContent = 'TAX COLLECTED (AZ Auto-Exempt FALSE)';
                    t2DetEl.textContent = 'AZ TPT Ruling 95-11 requires order intake, payment, and delivery inside reservation; online checkout defaults to taxable.';
                    auditEl.textContent = 'Keep AZ auto-exempt gate set to FALSE in jurisdiction rules pending CPA review of interstate nexus vs. Form 5000A.';
                    payloadEl.textContent = 'Stripe: { discounts: [{ coupon: "TRIBAL_20" }], automatic_tax: { enabled: true } }';
                }
            } else if (verified && !onRes) {
                tagEl.className = 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30';
                tagEl.textContent = 'SCENARIO 2: IDENTITY PRIVILEGE ONLY';
                titleEl.textContent = 'Enrolled Tribal Member + Off-Reservation Shipping Address';
                t1ResEl.className = 'text-lg font-extrabold text-amber-300 mt-1';
                t1ResEl.textContent = 'ACTIVE (20% Off Eligible Goods)';
                t1DetEl.textContent = 'Commercial retail discount applies nationwide upon verified tribal citizenship.';
                t2ResEl.className = 'text-lg font-extrabold text-rose-400 mt-1';
                t2ResEl.textContent = 'FULL STATE & LOCAL SALES TAX';
                t2DetEl.textContent = 'PostGIS ST_Contains returned FALSE; federal preemption does not apply outside Indian Country.';
                auditEl.textContent = 'Log negative PostGIS boundary evaluation proving statutory sales tax was properly assessed and collected.';
                payloadEl.textContent = 'Stripe: { discounts: [{ coupon: "TRIBAL_20" }], automatic_tax: { enabled: true } }';
            } else if (!verified && onRes) {
                tagEl.className = 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30';
                tagEl.textContent = 'SCENARIO 3: UNVERIFIED ON-RESERVATION';
                titleEl.textContent = 'Non-Enrolled or Unverified Buyer + Reservation Delivery';
                t1ResEl.className = 'text-lg font-extrabold text-slate-300 mt-1';
                t1ResEl.textContent = 'NONE (0% Commercial Discount)';
                t1DetEl.textContent = 'Customer lacks an approved KYC verification record.';
                t2ResEl.className = 'text-lg font-extrabold text-rose-400 mt-1';
                t2ResEl.textContent = 'FULL STATE & LOCAL SALES TAX';
                t2DetEl.textContent = 'On-reservation delivery alone does not exempt non-tribal or unverified purchasers.';
                auditEl.textContent = 'Display pre-payment KYC verification prompt if buyer claims tribal citizenship; otherwise collect full tax and log standard retail order.';
                payloadEl.textContent = 'Stripe: { discounts: [], automatic_tax: { enabled: true } }';
            } else {
                tagEl.className = 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-slate-600/40 text-slate-300 border border-slate-500/40';
                tagEl.textContent = 'SCENARIO 4: STANDARD RETAIL';
                titleEl.textContent = 'Standard Retail Customer + Off-Reservation Delivery';
                t1ResEl.className = 'text-lg font-extrabold text-slate-300 mt-1';
                t1ResEl.textContent = 'NONE (0% Commercial Discount)';
                t1DetEl.textContent = 'Standard catalog pricing applies across all physical goods, fees, and services.';
                t2ResEl.className = 'text-lg font-extrabold text-rose-400 mt-1';
                t2ResEl.textContent = 'FULL STATE & LOCAL SALES TAX';
                t2DetEl.textContent = 'Stripe Tax calculates destination sales tax automatically via automatic_tax: { enabled: true }.';
                auditEl.textContent = 'Standard e-commerce transaction logging; zero tribal enrollment or tax exemption documentation collected.';
                payloadEl.textContent = 'Stripe: { discounts: [], automatic_tax: { enabled: true } }';
            }
        }

        simVerifiedEl.addEventListener('change', updateSimulator);
        simOnResEl.addEventListener('change', updateSimulator);
        simJurisdictionEl.addEventListener('change', updateSimulator);
        updateSimulator();

        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('main section[id]');
        window.addEventListener('scroll', () => {
            let current = '';
            sections.forEach(sec => {
                const top = sec.offsetTop - 120;
                if (window.scrollY >= top) {
                    current = sec.getAttribute('id');
                }
            });
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        });
    
})();
