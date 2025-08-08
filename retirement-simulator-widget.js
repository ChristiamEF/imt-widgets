/**
 * WIDGET SIMULADOR DE RETIRO v1.0
 * Creado para ser seguro, embedible y responsive.
 * Contiene toda la lógica, HTML y CSS en un solo archivo para fácil mantenimiento.
 * Dependencia externa: Chart.js (debe ser cargado por la página anfitriona).
 */
(function() {
    // Encapsulamos todo en una función para evitar conflictos con el scope global.

    const containerId = 'retirement-simulator-widget';
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Error: No se encontró el contenedor del widget con id #${containerId}.`);
        return;
    }

    // --- HTML y CSS del Widget ---
    const widgetHTML = `
        <style>
            /* Reset básico para el contenedor para evitar herencias extrañas */
            .rc-glass-container, .rc-glass-container * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            .rc-glass-container {
                font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
                width: 100%;
                max-width: 950px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                border: 1px solid rgba(255, 255, 255, 0.18);
                border-radius: 24px;
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
                padding: 40px;
                color: #fff;
                transition: all 0.5s ease;
            }

            .rc-wizard-step { display: none; }
            .rc-wizard-step.active { display: block; animation: rc-fadeIn 0.5s ease-in-out; }
            @keyframes rc-fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

            .rc-progress-bar { width: 100%; height: 8px; background: rgba(255, 255, 255, 0.2); border-radius: 4px; margin-bottom: 30px; overflow: hidden; }
            .rc-progress-fill { height: 100%; width: 0%; background-color: #fff; border-radius: 4px; transition: width 0.4s ease; }
            
            .rc-question { font-size: 24px; font-weight: 600; margin-bottom: 25px; text-align: center; }
            
            .rc-input-row { display: flex; gap: 20px; justify-content: center; text-align: center; }
            .rc-input-wrapper input { font-family: monospace; font-size: 28px; background: transparent; border: none; border-bottom: 2px solid rgba(255, 255, 255, 0.5); color: #fff; padding: 5px 0; width: 100%; max-width: 300px; text-align: center; }
            .rc-input-wrapper input:focus { outline: none; border-bottom-color: #fff; }
            .rc-input-wrapper label { display: block; margin-top: 10px; opacity: 0.8; }
            
            .rc-navigation { margin-top: 40px; display: flex; justify-content: space-between; }
            .rc-btn { background: #fff; color: #29323c; border: none; padding: 12px 30px; border-radius: 50px; font-size: 16px; font-weight: bold; cursor: pointer; transition: transform 0.2s ease; }
            .rc-btn:hover { transform: scale(1.05); }
            .rc-btn.secondary { background: transparent; border: 2px solid #fff; color: #fff; }

            #rc-dashboard { display: none; animation: rc-fadeIn 0.5s ease-in-out; }
            .rc-dashboard-grid { display: grid; grid-template-columns: 300px 1fr; gap: 40px; }
            
            .rc-controls-panel h3 { font-size: 16px; opacity: 0.7; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 8px; }
            .rc-dash-input-group { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
            .rc-dash-input-group label { font-size: 14px; opacity: 0.8; flex-basis: 60%; }
            .rc-dash-input-group input { width: 90px; font-size: 14px; text-align: right; background: rgba(0,0,0,0.2); border: 1px solid transparent; color: #fff; padding: 6px; border-radius: 6px; font-family: monospace; }
            .rc-dash-input-group input:focus { outline: none; border-color: rgba(255,255,255,0.5); }
            
            .rc-chart-container { min-height: 300px; position: relative; }
            .rc-results-panel { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px 20px; }
            .rc-result-item label { opacity: 0.7; font-size: 14px; }
            .rc-result-item .rc-value { font-size: 22px; font-weight: 600; }
            .rc-result-item.main-result { grid-column: 1 / -1; text-align: center; }
            .main-result .rc-value { font-size: 36px; }
            .rc-value.unreachable { font-size: 20px !important; color: #ffcdd2; }
            
            @media (max-width: 850px) {
                .rc-dashboard-grid { grid-template-columns: 1fr; gap: 30px; }
            }
            @media (max-width: 600px) {
                .rc-glass-container { padding: 25px; }
                .rc-question { font-size: 20px; }
                .rc-input-row { flex-direction: column; gap: 25px; }
                .rc-input-wrapper input { font-size: 24px; }
                .rc-results-panel { grid-template-columns: 1fr; }
                .main-result .rc-value { font-size: 32px; }
                .rc-result-item { text-align: center; }
            }
        </style>
        
        <div class="rc-glass-container" id="main-container">
            <div id="rc-wizard">
                <div class="rc-progress-bar"><div class="rc-progress-fill" id="rc-progress-fill"></div></div>
                <div class="rc-wizard-step active" id="step1">
                    <p class="rc-question">🎂 ¿Cuál es tu edad actual y a qué edad planeas retirarte?</p>
                    <div class="rc-input-row">
                        <div class="rc-input-wrapper"><input type="number" id="wiz-current-age" value="25"><label>Edad Actual</label></div>
                        <div class="rc-input-wrapper"><input type="number" id="wiz-retirement-age" value="67"><label>Edad de Retiro</label></div>
                    </div>
                    <div class="rc-navigation"><div></div><button class="rc-btn" id="btn-step1-next">Siguiente →</button></div>
                </div>
                <div class="rc-wizard-step" id="step2">
                    <p class="rc-question">🏖️ En dinero de hoy, ¿qué costo de vida mensual te gustaría tener?</p>
                    <div class="rc-input-wrapper" style="text-align: center;"><input type="text" id="wiz-desired-lifestyle" value="3.000"><label>Costo de Vida (€/mes)</label></div>
                    <div class="rc-navigation"><button class="rc-btn secondary" id="btn-step2-prev">← Atrás</button><button class="rc-btn" id="btn-step2-next">Siguiente →</button></div>
                </div>
                <div class="rc-wizard-step" id="step3">
                    <p class="rc-question">🌱 ¿Cuánto puedes aportar mensualmente y 💰 cuánto tienes ya disponible?</p>
                    <div class="rc-input-row">
                        <div class="rc-input-wrapper"><input type="text" id="wiz-monthly-savings" value="500"><label>Ahorro Mensual (€)</label></div>
                        <div class="rc-input-wrapper"><input type="text" id="wiz-initial-investment" value="10.000"><label>Disponible Ya (€)</label></div>
                    </div>
                    <div class="rc-navigation"><button class="rc-btn secondary" id="btn-step3-prev">← Atrás</button><button class="rc-btn" id="btn-show-dash">Crear Mi Simulador 🚀</button></div>
                </div>
            </div>
            <div id="rc-dashboard" style="display: none;">
                <div class="rc-dashboard-grid">
                    <div class="rc-controls-panel">
                        <h3>🛠️ Tus Palancas</h3>
                        <div class="rc-dash-input-group"><label>🎂 Edad actual</label><input type="number" id="dash-current-age"></div>
                        <div class="rc-dash-input-group"><label>🏁 Edad de retiro</label><input type="number" id="dash-retirement-age"></div>
                        <div class="rc-dash-input-group"><label>💰 Disponible inicial (€)</label><input type="text" id="dash-initial-investment"></div>
                        <div class="rc-dash-input-group"><label>🌱 Ahorro mensual (€)</label><input type="text" id="dash-monthly-savings"></div>
                        <div class="rc-dash-input-group"><label>🏖️ Costo de vida (€/mes)</label><input type="text" id="dash-desired-lifestyle"></div>
                        <h3 style="margin-top: 20px;">📈 Parámetros de Mercado</h3>
                        <div class="rc-dash-input-group"><label>🔥 Inflación anual (%)</label><input type="number" id="dash-inflation-rate" step="0.1"></div>
                        <div class="rc-dash-input-group"><label>🏦 Tasa perpetuidad (%)</label><input type="number" id="dash-perpetuity-rate" step="0.1"></div>
                    </div>
                    <div class="rc-results-display">
                        <div class="rc-chart-container"><canvas id="retirementChart"></canvas></div>
                        <div class="rc-results-panel">
                            <div class="rc-result-item main-result"><label>🎯 Rendimiento Anual Requerido</label><div class="rc-value" id="rc-out-required-rate">--</div></div>
                            <div class="rc-result-item"><label>💰 Portafolio Objetivo</label><div class="rc-value" id="rc-out-target-portfolio">--</div></div>
                            <div class="rc-result-item"><label>🎢 Tolerancia al Riesgo</label><div class="rc-value" id="rc-out-risk-profile">--</div></div>
                            <div class="rc-result-item"><label>💸 Costo Vida (Retiro)</label><div class="rc-value" id="rc-out-future-cost">--</div></div>
                            <div class="rc-result-item"><label>🗓️ Horizonte</label><div class="rc-value" id="rc-out-horizon">--</div></div>
                        </div>
                    </div>
                </div>
                <div class="rc-navigation" style="justify-content: center; margin-top: 30px;"><button class="rc-btn secondary" id="btn-back-to-wiz">← Volver al Asistente</button></div>
            </div>
        </div>
    `;

    // --- Lógica del Widget ---
    let currentStep = 1;
    const totalSteps = 3;
    let retirementChartInstance = null;
    
    const formatForDisplay = (num) => new Intl.NumberFormat('es-ES').format(Math.round(num));
    const parseFormattedNumber = (str) => { if (typeof str !== 'string') str = String(str); return parseFloat(str.replace(/\./g, '').replace(/,/g, '.')) || 0; };
    const getNumericVal = (id) => parseFormattedNumber(document.getElementById(id).value);

    function updateProgress() { document.getElementById('rc-progress-fill').style.width = (currentStep - 1) / totalSteps * 100 + '%'; }
    function nextStep() { if (currentStep < totalSteps) { document.getElementById(`step${currentStep}`).classList.remove('active'); currentStep++; document.getElementById(`step${currentStep}`).classList.add('active'); updateProgress(); } }
    function prevStep() { if (currentStep > 1) { document.getElementById(`step${currentStep}`).classList.remove('active'); currentStep--; document.getElementById(`step${currentStep}`).classList.add('active'); updateProgress(); } }

    function showDashboard() {
        ['initial-investment', 'monthly-savings', 'desired-lifestyle'].forEach(id => { document.getElementById(`dash-${id}`).value = formatForDisplay(getNumericVal(`wiz-${id}`)); });
        document.getElementById('dash-current-age').value = getNumericVal('wiz-current-age');
        document.getElementById('dash-retirement-age').value = getNumericVal('wiz-retirement-age');
        document.getElementById('dash-inflation-rate').value = 3.0;
        document.getElementById('dash-perpetuity-rate').value = 4.0;
        document.getElementById('rc-wizard').style.display = 'none';
        document.getElementById('rc-dashboard').style.display = 'block';
        document.getElementById('main-container').style.maxWidth = '950px';
        calculateAndRender();
    }

    function goBackToWizard() {
        document.getElementById('rc-dashboard').style.display = 'none';
        document.getElementById('rc-wizard').style.display = 'block';
        document.getElementById('main-container').style.maxWidth = '850px';
    }
    
    function calculateAndRender() {
        if (typeof Chart === 'undefined') { console.error('Chart.js no está cargado.'); return; }
        const currentAge = getNumericVal('dash-current-age');
        const retirementAge = getNumericVal('dash-retirement-age');
        const initialInvestment = getNumericVal('dash-initial-investment');
        const monthlySavings = getNumericVal('dash-monthly-savings');
        const desiredLifestyle = getNumericVal('dash-desired-lifestyle');
        const inflationRate = parseFloat(document.getElementById('dash-inflation-rate').value.replace(',', '.')) / 100 || 0;
        const perpetuityRate = parseFloat(document.getElementById('dash-perpetuity-rate').value.replace(',', '.')) / 100 || 0;
        const yearsToAccumulate = Math.max(0, retirementAge - currentAge);
        const annualSavings = monthlySavings * 12;
        const futureMonthlyCost = desiredLifestyle * Math.pow(1 + inflationRate, yearsToAccumulate);
        const targetPortfolio = perpetuityRate > 0 ? (futureMonthlyCost * 12) / perpetuityRate : 0;
        const requiredRate = calculateRequiredRate(targetPortfolio, yearsToAccumulate, annualSavings, initialInvestment);
        renderTextResults(requiredRate, targetPortfolio, futureMonthlyCost, yearsToAccumulate);
        renderRetirementChart(yearsToAccumulate, initialInvestment, annualSavings, isNaN(requiredRate) ? 0.08 : requiredRate);
    }

    function renderTextResults(rate, portfolio, cost, years) {
        let riskProfile = '--';
        const requiredRateEl = document.getElementById('rc-out-required-rate');
        if (isNaN(rate)) { requiredRateEl.textContent = 'Inalcanzable'; requiredRateEl.classList.add('unreachable'); riskProfile = 'Muy Agresivo'; } 
        else {
            requiredRateEl.textContent = new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 2 }).format(rate);
            requiredRateEl.classList.remove('unreachable');
            if (rate < 0.05) riskProfile = 'Conservador'; else if (rate < 0.09) riskProfile = 'Moderado'; else riskProfile = 'Agresivo';
        }
        const formatCurrency = (num) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
        document.getElementById('rc-out-target-portfolio').textContent = formatCurrency(portfolio);
        document.getElementById('rc-out-risk-profile').textContent = riskProfile;
        document.getElementById('rc-out-future-cost').textContent = formatCurrency(cost) + '/mes';
        document.getElementById('rc-out-horizon').textContent = years + ' años';
    }

    function renderRetirementChart(years, pv, pmt, rate) {
        const labels = Array.from({ length: years + 1 }, (_, i) => i);
        const principalData = [], interestData = [];
        for (let i = 0; i <= years; i++) {
            const totalPrincipal = pv + (pmt * i);
            const fv = rate === 0 ? pv + pmt * i : pv * Math.pow(1 + rate, i) + pmt * ((Math.pow(1 + rate, i) - 1) / rate);
            const totalInterest = fv - totalPrincipal;
            principalData.push(totalPrincipal);
            interestData.push(totalInterest > 0 ? totalInterest : 0);
        }
        const ctx = document.getElementById('retirementChart').getContext('2d');
        if (retirementChartInstance) retirementChartInstance.destroy();
        retirementChartInstance = new Chart(ctx, {
            type: 'bar', data: { labels: labels, datasets: [{ label: 'Ahorro Acumulado', data: principalData, backgroundColor: 'rgba(255, 255, 255, 0.4)'}, { label: 'Interés Compuesto', data: interestData, backgroundColor: 'rgba(255, 255, 255, 0.8)'}]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' }}}, scales: { x: { stacked: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#fff' } }, y: { stacked: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#fff', callback: value => new Intl.NumberFormat('es-ES', {notation: "compact"}).format(value) }}}}
        });
    }

    function calculateRequiredRate(target, years, pmt, pv) { if (years <= 0) return 0; let low = -0.99, high = 2, mid, fv; let i = 0; if (pv + pmt * years >= target) return 0; do { mid = (low + high) / 2; fv = mid === 0 ? pv + pmt * years : pv * Math.pow(1 + mid, years) + pmt * ((Math.pow(1 + mid, years) - 1) / mid); if (fv < target) { low = mid; } else { high = mid; } i++; } while (Math.abs(fv - target) > 1 && i < 100); if (i === 100 && Math.abs(fv - target) > 1000) return NaN; return mid; }
    
    function initializeWidget() {
        container.innerHTML = widgetHTML;

        // Listeners para los botones del Wizard
        document.getElementById('btn-step1-next').addEventListener('click', nextStep);
        document.getElementById('btn-step2-prev').addEventListener('click', prevStep);
        document.getElementById('btn-step2-next').addEventListener('click', nextStep);
        document.getElementById('btn-step3-prev').addEventListener('click', prevStep);
        document.getElementById('btn-show-dash').addEventListener('click', showDashboard);
        document.getElementById('btn-back-to-wiz').addEventListener('click', goBackToWizard);
        
        // Listeners para el formato de números
        const fieldsToFormat = [ 'wiz-desired-lifestyle', 'wiz-monthly-savings', 'wiz-initial-investment', 'dash-initial-investment', 'dash-monthly-savings', 'dash-desired-lifestyle' ];
        fieldsToFormat.forEach(id => {
            const input = document.getElementById(id);
            if(input) {
                input.addEventListener('blur', () => { if(input.value) input.value = formatForDisplay(parseFormattedNumber(input.value)); });
                input.addEventListener('focus', () => { if(input.value) input.value = parseFormattedNumber(input.value); });
            }
        });

        // Listeners para recálculo en el dashboard
        document.querySelectorAll('#rc-dashboard input').forEach(input => { input.addEventListener('input', calculateAndRender); });
        
        updateProgress();
    }
    
    // Iniciar el Widget
    initializeWidget();

})();
