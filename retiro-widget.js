// --- WIDGET DE CALCULADORA DE RETIRO ---
// Creado para ser seguro, aislado y embedible.

(function() {
    // Función principal que encapsula toda la lógica para evitar conflictos globales.

    // 1. FUNCIONES AUXILIARES Y DE CÁLCULO
    const formatCurrency = (num) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
    const formatPercent = (num) => new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);

    /**
     * Calcula la tasa de rendimiento requerida usando un método iterativo (goal seek).
     * @param {number} targetValue - El portafolio objetivo (FV).
     * @param {number} years - Años de acumulación.
     * @param {number} pmt - Aportación anual.
     * @param {number} pv - Valor presente o inversión inicial.
     * @returns {number} La tasa de rendimiento anual requerida.
     */
    function calculateRequiredRate(targetValue, years, pmt, pv) {
        if (years <= 0) return 0;

        let rate_low = -0.99; // Límite inferior
        let rate_high = 2.00;  // Límite superior (200% anual)
        let rate_mid;
        let fv_mid;
        let iterations = 0;
        const max_iterations = 100;

        // Si el ahorro ya cubre el objetivo, no se necesita rendimiento.
        if (pv + pmt * years >= targetValue) {
            return 0;
        }

        do {
            rate_mid = (rate_low + rate_high) / 2;
            fv_mid = pv * Math.pow(1 + rate_mid, years) + pmt * ((Math.pow(1 + rate_mid, years) - 1) / rate_mid);

            if (fv_mid < targetValue) {
                rate_low = rate_mid;
            } else {
                rate_high = rate_mid;
            }
            iterations++;
        } while (Math.abs(fv_mid - targetValue) > 1 && iterations < max_iterations); // Tolera una diferencia de 1€

        // Si después de 100 iteraciones no converge, es probable que sea inalcanzable.
        if (iterations === max_iterations && Math.abs(fv_mid - targetValue) > 1000) {
            return NaN; // Retorna NaN para indicar que es inalcanzable
        }

        return rate_mid;
    }
    
    // 2. LÓGICA DE LA INTERFAZ Y ACTUALIZACIÓN
    
    const containerId = 'retirement-calculator-widget';
    let container = document.getElementById(containerId);

    if (!container) {
        console.error(`Error: No se encontró el contenedor con id #${containerId}.`);
        return;
    }

    function render() {
        container.innerHTML = `
            <style>
                /* Estilos Aislados para el Widget de Retiro */
                .rc-widget-wrapper {
                    --rc-bg: #FFFFFF;
                    --rc-text-primary: #1a1a1a;
                    --rc-text-secondary: #8c8c8c;
                    --rc-border: #e6e6e6;
                    --rc-highlight: #124ab4; /* Un azul genérico para destacar */
                }
                .rc-widget {
                    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
                    background-color: var(--rc-bg);
                    color: var(--rc-text-primary);
                    padding: 24px;
                    border-radius: 16px;
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 32px;
                    max-width: 800px;
                    margin: auto;
                    border: 1px solid var(--rc-border);
                }
                @media (min-width: 768px) {
                    .rc-widget {
                        grid-template-columns: 1fr 1fr;
                        padding: 32px;
                    }
                }
                .rc-panel h2 {
                    font-size: 18px;
                    margin: 0 0 20px 0;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--rc-border);
                }
                .rc-input-group {
                    margin-bottom: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .rc-input-group label {
                    font-size: 14px;
                    color: var(--rc-text-secondary);
                    flex-basis: 60%;
                }
                .rc-input-group input {
                    font-family: monospace;
                    font-size: 16px;
                    text-align: right;
                    border: none;
                    border-bottom: 2px solid var(--rc-border);
                    background: transparent;
                    padding: 4px 0;
                    width: 100px;
                    transition: border-color 0.2s;
                }
                .rc-input-group input:focus {
                    outline: none;
                    border-color: var(--rc-highlight);
                }
                .rc-output-panel {
                    background-color: #f9fafb;
                    border-radius: 12px;
                    padding: 24px;
                }
                .rc-output-main {
                    text-align: center;
                    margin-bottom: 24px;
                }
                .rc-output-main label {
                    font-size: 14px;
                    color: var(--rc-text-secondary);
                    display: block;
                    margin-bottom: 4px;
                }
                .rc-output-main .rc-value {
                    font-size: 48px;
                    font-weight: 600;
                    line-height: 1.2;
                    color: var(--rc-highlight);
                }
                 .rc-output-main .rc-value.unreachable {
                    font-size: 24px;
                    color: #e53e3e;
                }
                .rc-output-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .rc-output-item .rc-value {
                    font-size: 18px;
                    font-weight: 600;
                }
            </style>
            
            <div class="rc-widget-wrapper">
                <div class="rc-widget">
                    <!-- Columna de Entradas -->
                    <div class="rc-panel rc-input-panel">
                        <h2>Parámetros de entrada</h2>
                        <div class="rc-input-group"><label for="rc-current-age">Edad actual</label><input type="number" id="rc-current-age" value="25"></div>
                        <div class="rc-input-group"><label for="rc-retirement-age">Edad de retiro</label><input type="number" id="rc-retirement-age" value="67"></div>
                        <div class="rc-input-group"><label for="rc-initial-investment">Disponible para invertir (€)</label><input type="number" id="rc-initial-investment" value="10000"></div>
                        <div class="rc-input-group"><label for="rc-monthly-savings">Ahorro mensual (€)</label><input type="number" id="rc-monthly-savings" value="500"></div>
                        <div class="rc-input-group"><label for="rc-desired-lifestyle">Costo de vida deseado (€/mes)</label><input type="number" id="rc-desired-lifestyle" value="3000"></div>
                        <div class="rc-input-group"><label for="rc-inflation-rate">Inflación anual proyectada (%)</label><input type="number" id="rc-inflation-rate" step="0.1" value="3.0"></div>
                        <div class="rc-input-group"><label for="rc-perpetuity-rate">Tasa de perpetuidad (%)</label><input type="number" id="rc-perpetuity-rate" step="0.1" value="4.0"></div>
                    </div>
                    
                    <!-- Columna de Resultados -->
                    <div class="rc-panel rc-output-panel">
                        <h2>Resultados</h2>
                        <div class="rc-output-main">
                            <label>Tasa de rendimiento anual requerida</label>
                            <div class="rc-value" id="rc-out-required-rate">--</div>
                        </div>
                        <div class="rc-output-grid">
                            <div class="rc-output-item">
                                <label>Portafolio objetivo</label>
                                <div class="rc-value" id="rc-out-target-portfolio">--</div>
                            </div>
                            <div class="rc-output-item">
                                <label>Tolerancia al riesgo</label>
                                <div class="rc-value" id="rc-out-risk-profile">--</div>
                            </div>
                            <div class="rc-output-item">
                                <label>Costo de vida (retiro)</label>
                                <div class="rc-value" id="rc-out-future-cost">--</div>
                            </div>
                            <div class="rc-output-item">
                                <label>Horizonte acumulación</label>
                                <div class="rc-value" id="rc-out-horizon">--</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function updateCalculations() {
        // Leer todos los valores de entrada
        const currentAge = parseFloat(document.getElementById('rc-current-age').value) || 0;
        const retirementAge = parseFloat(document.getElementById('rc-retirement-age').value) || 0;
        const initialInvestment = parseFloat(document.getElementById('rc-initial-investment').value) || 0;
        const monthlySavings = parseFloat(document.getElementById('rc-monthly-savings').value) || 0;
        const desiredLifestyle = parseFloat(document.getElementById('rc-desired-lifestyle').value) || 0;
        const inflationRate = (parseFloat(document.getElementById('rc-inflation-rate').value) || 0) / 100;
        const perpetuityRate = (parseFloat(document.getElementById('rc-perpetuity-rate').value) || 0) / 100;

        // Cálculos intermedios
        const yearsToAccumulate = Math.max(0, retirementAge - currentAge);
        const annualSavings = monthlySavings * 12;

        const futureMonthlyCost = desiredLifestyle * Math.pow(1 + inflationRate, yearsToAccumulate);
        const futureAnnualCost = futureMonthlyCost * 12;
        
        const targetPortfolio = perpetuityRate > 0 ? futureAnnualCost / perpetuityRate : 0;
        
        // Cálculo principal: Tasa de rendimiento requerida
        const requiredRate = calculateRequiredRate(targetPortfolio, yearsToAccumulate, annualSavings, initialInvestment);

        // Determinar perfil de riesgo
        let riskProfile = '--';
        if (!isNaN(requiredRate)) {
            if (requiredRate < 0.05) riskProfile = 'Conservador';
            else if (requiredRate < 0.09) riskProfile = 'Moderado';
            else riskProfile = 'Agresivo';
        }

        // Actualizar la interfaz
        const requiredRateEl = document.getElementById('rc-out-required-rate');
        if (isNaN(requiredRate)) {
            requiredRateEl.textContent = 'Inalcanzable';
            requiredRateEl.classList.add('unreachable');
            riskProfile = 'Muy Agresivo';
        } else {
            requiredRateEl.textContent = formatPercent(requiredRate);
            requiredRateEl.classList.remove('unreachable');
        }
        
        document.getElementById('rc-out-target-portfolio').textContent = formatCurrency(targetPortfolio);
        document.getElementById('rc-out-risk-profile').textContent = riskProfile;
        document.getElementById('rc-out-future-cost').textContent = formatCurrency(futureMonthlyCost) + '/mes';
        document.getElementById('rc-out-horizon').textContent = yearsToAccumulate + ' años';
    }
    
    // Iniciar el widget
    render();
    document.querySelectorAll('.rc-input-panel input').forEach(input => {
        input.addEventListener('input', updateCalculations);
    });
    updateCalculations(); // Calcular con los valores iniciales

})();
