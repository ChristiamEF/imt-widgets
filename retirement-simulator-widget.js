/**
 * =================================================================================
 * WIDGET SIMULADOR DE RETIRO v1.1 (Final, Comentado)
 * Creado para ser seguro, embedible y responsive.
 * ---------------------------------------------------------------------------------
 * Este script crea una calculadora de retiro interactiva dentro de un div específico.
 * Está diseñado para ser completamente autocontenido y no interferir con la página
 * anfitriona.
 *
 * Dependencia Externa: Chart.js (https://www.chartjs.org/)
 * Chart.js debe ser cargado en la página anfitriona para que la gráfica funcione.
 * =================================================================================
 */

// Se encapsula todo el código en una IIFE (Immediately Invoked Function Expression).
// Esto crea un scope privado, evitando que nuestras variables y funciones
// contaminen el scope global de la página donde se inserte el widget.
(function() {
    
    // --- VARIABLES GLOBALES DEL WIDGET ---
    
    // ID del div contenedor donde se renderizará el widget.
    const containerId = 'retirement-simulator-widget';
    const container = document.getElementById(containerId);

    // Si el contenedor no existe en la página, detenemos la ejecución para evitar errores.
    if (!container) {
        console.error(`Error: No se encontró el contenedor del widget con id #${containerId}.`);
        return;
    }

    // Variables para gestionar el estado del widget.
    let currentStep = 1;
    const totalSteps = 3;
    let retirementChartInstance = null; // Guardará la instancia de la gráfica para poder destruirla y redibujarla.

    // --- HTML Y CSS DEL WIDGET ---
    // Todo el HTML y CSS se definen en una sola cadena de texto.
    // Esto hace que el widget sea un componente verdaderamente portátil.
    const widgetHTML = `
        <style>
            /* Reset básico para el contenedor para evitar herencias de estilos no deseadas. */
            .rc-card-container, .rc-card-container * { margin: 0; padding: 0; box-sizing: border-box; }
            
            .rc-card-container {
                font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
                width: 100%;
                max-width: 950px;
                margin: 20px auto; /* Centra el widget y le da espacio vertical. */
                background: #ffffff;
                border: 2px solid #1a1a1a;
                border-radius: 24px;
                box-shadow: 0 10px 0 #1a1a1a; /* La sombra sólida distintiva. */
                padding: 40px;
                color: #1a1a1a;
                transition: all 0.5s ease;
            }
            /* ... (El resto de los estilos CSS van aquí, se omiten por brevedad en este comentario) ... */
            .rc-wizard-step { display: none; }
            .rc-wizard-step.active { display: block; animation: rc-fadeIn 0.5s ease-in-out; }
            @keyframes rc-fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .rc-progress-bar { width: 100%; height: 8px; background-color: #f0f2f5; border-radius: 4px; margin-bottom: 30px; overflow: hidden; }
            .rc-progress-fill { height: 100%; width: 0%; background-color: #1a1a1a; border-radius: 4px; transition: width 0.4s ease; }
            .rc-question { font-size: 24px; font-weight: 600; margin-bottom: 25px; text-align: center; }
            .rc-input-row { display: flex; gap: 20px; justify-content: center; text-align: center; }
            .rc-input-wrapper input { font-family: monospace; font-size: 28px; background: transparent; border: none; border-bottom: 2px solid #ccc; color: #1a1a1a; padding: 5px 0; width: 100%; max-width: 300px; text-align: center; }
            .rc-input-wrapper input:focus { outline: none; border-bottom-color: #1a1a1a; }
            .rc-input-wrapper label { display: block; margin-top: 10px; color: #555; }
            .rc-navigation { margin-top: 40px; display: flex; justify-content: space-between; }
            .rc-btn { background: #1a1a1a; color: #fff; border: 2px solid #1a1a1a; padding: 12px 30px; border-radius: 50px; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.2s ease; }
            .rc-btn:hover { background: #333; border-color: #333; transform: translateY(-2px); }
            .rc-btn.secondary { background: #fff; color: #1a1a1a; }
            .rc-btn.secondary:hover { background: #f0f2f5; }
            #rc-dashboard { display: none; animation: rc-fadeIn 0.5s ease-in-out; }
            .rc-dashboard-grid { display: grid; grid-template-columns: 300px 1fr; gap: 40px; }
            .rc-controls-panel h3 { font-size: 16px; color: #555; margin: 20px 0 15px 0; border-bottom: 1px solid #eee; padding-bottom: 8px; }
            .rc-controls-panel h3:first-child { margin-top: 0; }
            .rc-dash-input-group { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
            .rc-dash-input-group label { font-size: 14px; color: #333; flex-basis: 60%; }
            .rc-dash-input-group input { width: 90px; font-size: 14px; text-align: right; background: #f0f2f5; border: 1px solid #ccc; color: #1a1a1a; padding: 6px; border-radius: 6px; font-family: monospace; }
            .rc-dash-input-group input:focus { outline: none; border-color: #1a1a1a; background: #fff; }
            .rc-chart-container { min-height: 300px; position: relative; }
            .rc-results-panel { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px 20px; }
            .rc-result-item label { color: #555; font-size: 14px; }
            .rc-result-item .rc-value { font-size: 22px; font-weight: 600; }
            .rc-result-item.main-result { grid-column: 1 / -1; text-align: center; background-color: #f9f9f9; padding: 15px; border-radius: 12px; }
            .main-result .rc-value { font-size: 36px; }
            .rc-value.unreachable { font-size: 20px !important; color: #d32f2f; }
            @media (max-width: 850px) { .rc-dashboard-grid { grid-template-columns: 1fr; } }
            @media (max-width: 600px) {
                .rc-card-container { padding: 25px; margin: 20px 10px; }
                .rc-question { font-size: 20px; }
                .rc-input-row { flex-direction: column; gap: 25px; }
                .rc-input-wrapper input { font-size: 24px; }
                .rc-results-panel { grid-template-columns: 1fr; }
                .main-result .rc-value { font-size: 32px; }
                .rc-result-item { text-align: center; }
            }
        </style>
        
        <div class="rc-card-container" id="main-container">
            <!-- Vista 1: El Asistente (Wizard) -->
            <div id="rc-wizard">
                <div class="rc-progress-bar"><div class="rc-progress-fill" id="rc-progress-fill"></div></div>
                <!-- Pasos del Wizard -->
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
            
            <!-- Vista 2: El Dashboard de Simulación -->
            <div id="rc-dashboard" style="display: none;">
                <div class="rc-dashboard-grid">
                    <!-- Columna de Controles para simulación en tiempo real -->
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
                    <!-- Columna de Resultados (Gráfica y Números) -->
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

    // --- FUNCIONES DE UTILIDAD ---

    /**
     * Formatea un número para mostrarlo con separadores de miles (ej. 10000 -> "10.000").
     * @param {number} num - El número a formatear.
     * @returns {string} El número formateado.
     */
    const formatForDisplay = (num) => new Intl.NumberFormat('es-ES').format(Math.round(num));

    /**
     * Convierte una cadena de texto formateada (ej. "10.000" o "10,000") a un número.
     * @param {string} str - La cadena de texto a convertir.
     * @returns {number} El número parseado.
     */
    const parseFormattedNumber = (str) => {
        if (typeof str !== 'string') str = String(str);
        // Elimina puntos (separador de miles en español) y reemplaza comas por puntos (decimal).
        return parseFloat(str.replace(/\./g, '').replace(/,/g, '.')) || 0;
    };
    
    /**
     * Obtiene el valor numérico de un campo del formulario.
     * @param {string} id - El ID del elemento input.
     * @returns {number} El valor numérico.
     */
    const getNumericVal = (id) => parseFormattedNumber(document.getElementById(id).value);

    // --- LÓGICA DEL WIZARD (ASISTENTE) ---
    
    function updateProgress() { document.getElementById('rc-progress-fill').style.width = (currentStep - 1) / totalSteps * 100 + '%'; }
    function nextStep() { if (currentStep < totalSteps) { document.getElementById(`step${currentStep}`).classList.remove('active'); currentStep++; document.getElementById(`step${currentStep}`).classList.add('active'); updateProgress(); } }
    function prevStep() { if (currentStep > 1) { document.getElementById(`step${currentStep}`).classList.remove('active'); currentStep--; document.getElementById(`step${currentStep}`).classList.add('active'); updateProgress(); } }

    /**
     * Transición del wizard al dashboard. Transfiere los datos y muestra la vista de resultados.
     */
    function showDashboard() {
        // Transferir datos del wizard a los campos del dashboard.
        ['initial-investment', 'monthly-savings', 'desired-lifestyle'].forEach(id => {
            document.getElementById(`dash-${id}`).value = formatForDisplay(getNumericVal(`wiz-${id}`));
        });
        document.getElementById('dash-current-age').value = getNumericVal('wiz-current-age');
        document.getElementById('dash-retirement-age').value = getNumericVal('wiz-retirement-age');
        
        // Establecer valores por defecto para los parámetros de mercado.
        document.getElementById('dash-inflation-rate').value = "3,0";
        document.getElementById('dash-perpetuity-rate').value = "4,0";
        
        // Ocultar wizard y mostrar dashboard.
        document.getElementById('rc-wizard').style.display = 'none';
        document.getElementById('rc-dashboard').style.display = 'block';
        
        // Calcular y renderizar todo por primera vez.
        calculateAndRender();
    }

    /**
     * Vuelve del dashboard al wizard para corregir datos.
     */
    function goBackToWizard() {
        document.getElementById('rc-dashboard').style.display = 'none';
        document.getElementById('rc-wizard').style.display = 'block';
    }
    
    // --- LÓGICA PRINCIPAL DE CÁLCULO Y RENDERIZADO ---

    /**
     * Función central que se ejecuta cada vez que un valor cambia en el dashboard.
     * Orquesta la obtención de datos, los cálculos y la actualización de la UI.
     */
    function calculateAndRender() {
        // Pre-condición: Verificar que Chart.js está disponible.
        if (typeof Chart === 'undefined') {
            console.error('Error: Chart.js no está cargado. Asegúrate de que el script de Chart.js esté en la página.');
            return;
        }

        // 1. Obtener todos los valores de los inputs del dashboard.
        const currentAge = getNumericVal('dash-current-age');
        const retirementAge = getNumericVal('dash-retirement-age');
        const initialInvestment = getNumericVal('dash-initial-investment');
        const monthlySavings = getNumericVal('dash-monthly-savings');
        const desiredLifestyle = getNumericVal('dash-desired-lifestyle');
        const inflationRate = parseFloat(document.getElementById('dash-inflation-rate').value.replace(',', '.')) / 100 || 0;
        const perpetuityRate = parseFloat(document.getElementById('dash-perpetuity-rate').value.replace(',', '.')) / 100 || 0;

        // 2. Realizar los cálculos financieros.
        const yearsToAccumulate = Math.max(0, retirementAge - currentAge);
        const annualSavings = monthlySavings * 12;
        const futureMonthlyCost = desiredLifestyle * Math.pow(1 + inflationRate, yearsToAccumulate);
        const targetPortfolio = perpetuityRate > 0 ? (futureMonthlyCost * 12) / perpetuityRate : 0;
        const requiredRate = calculateRequiredRate(targetPortfolio, yearsToAccumulate, annualSavings, initialInvestment);
        
        // 3. Renderizar los resultados en la UI.
        renderTextResults(requiredRate, targetPortfolio, futureMonthlyCost, yearsToAccumulate);
        renderRetirementChart(yearsToAccumulate, initialInvestment, annualSavings, isNaN(requiredRate) ? 0.08 : requiredRate); // Si es inalcanzable, grafica con un 8% por defecto.
    }

    /**
     * Actualiza todos los campos de texto con los resultados calculados.
     */
    function renderTextResults(rate, portfolio, cost, years) {
        let riskProfile = '--';
        const requiredRateEl = document.getElementById('rc-out-required-rate');
        
        // Determinar el texto y estilo del rendimiento requerido.
        if (isNaN(rate)) {
            requiredRateEl.textContent = 'Inalcanzable';
            requiredRateEl.classList.add('unreachable');
            riskProfile = 'Muy Agresivo';
        } else {
            requiredRateEl.textContent = new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 2 }).format(rate);
            requiredRateEl.classList.remove('unreachable');
            // Asignar perfil de riesgo basado en la tasa.
            if (rate < 0.05) riskProfile = 'Conservador';
            else if (rate < 0.09) riskProfile = 'Moderado';
            else riskProfile = 'Agresivo';
        }
        
        const formatCurrency = (num) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
        
        // Actualizar los elementos del DOM.
        document.getElementById('rc-out-target-portfolio').textContent = formatCurrency(portfolio);
        document.getElementById('rc-out-risk-profile').textContent = riskProfile;
        document.getElementById('rc-out-future-cost').textContent = formatCurrency(cost) + '/mes';
        document.getElementById('rc-out-horizon').textContent = years + ' años';
    }

    /**
     * Dibuja o actualiza la gráfica de barras con los datos del portafolio.
     */
    function renderRetirementChart(years, pv, pmt, rate) {
        const labels = Array.from({ length: years + 1 }, (_, i) => i); // Eje X: 0 a N años
        const principalData = []; // Datos para "Ahorro Acumulado"
        const interestData = [];  // Datos para "Interés Compuesto"

        // Generar los datos para cada año.
        for (let i = 0; i <= years; i++) {
            const totalPrincipal = pv + (pmt * i);
            const futureValue = (rate === 0) 
                ? pv + pmt * i 
                : pv * Math.pow(1 + rate, i) + pmt * ((Math.pow(1 + rate, i) - 1) / rate);
            const totalInterest = futureValue - totalPrincipal;
            
            principalData.push(totalPrincipal);
            interestData.push(totalInterest > 0 ? totalInterest : 0);
        }

        const ctx = document.getElementById('retirementChart').getContext('2d');
        
        // Si ya existe una gráfica, destruirla para evitar problemas de renderizado.
        if (retirementChartInstance) {
            retirementChartInstance.destroy();
        }
        
        // Crear la nueva instancia de la gráfica.
        retirementChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Ahorro Acumulado', data: principalData, backgroundColor: '#cccccc' },
                    { label: 'Interés Compuesto', data: interestData, backgroundColor: '#333333' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#555' }}},
                scales: {
                    x: { stacked: true, grid: { color: '#f0f2f5' }, ticks: { color: '#555' } },
                    y: { stacked: true, grid: { color: '#f0f2f5' }, ticks: { color: '#555', callback: value => new Intl.NumberFormat('es-ES', {notation: "compact"}).format(value) } }
                }
            }
        });
    }

    /**
     * El "motor" matemático. Calcula la tasa de interés requerida (TIR)
     * usando un método iterativo de búsqueda de objetivos (similar a Goal Seek de Excel).
     */
    function calculateRequiredRate(target, years, pmt, pv) {
        if (years <= 0) return 0;
        if (pv + pmt * years >= target) return 0;

        let low = -0.99, high = 2.00, mid, fv;
        let iterations = 0;
        const maxIterations = 100;

        do {
            mid = (low + high) / 2;
            fv = (mid === 0) 
                ? pv + pmt * years 
                : pv * Math.pow(1 + mid, years) + pmt * ((Math.pow(1 + mid, years) - 1) / mid);
            
            if (fv < target) { low = mid; } else { high = mid; }
            iterations++;
        } while (Math.abs(fv - target) > 1 && iterations < maxIterations);
        
        // Si no converge, el objetivo es probablemente inalcanzable.
        if (iterations === maxIterations && Math.abs(fv - target) > 1000) return NaN;
        
        return mid;
    }
    
    /**
     * Función de inicialización principal. Se ejecuta una sola vez.
     * Renderiza el HTML inicial y asigna todos los event listeners.
     */
    function initializeWidget() {
        // Inyecta la estructura HTML y CSS en el div contenedor.
        container.innerHTML = widgetHTML;

        // Asigna las funciones a los botones del Wizard.
        document.getElementById('btn-step1-next').addEventListener('click', nextStep);
        document.getElementById('btn-step2-prev').addEventListener('click', prevStep);
        document.getElementById('btn-step2-next').addEventListener('click', nextStep);
        document.getElementById('btn-step3-prev').addEventListener('click', prevStep);
        document.getElementById('btn-show-dash').addEventListener('click', showDashboard);
        document.getElementById('btn-back-to-wiz').addEventListener('click', goBackToWizard);
        
        // Asigna los listeners para el formateo de números.
        const fieldsToFormat = [ 'wiz-desired-lifestyle', 'wiz-monthly-savings', 'wiz-initial-investment', 'dash-initial-investment', 'dash-monthly-savings', 'dash-desired-lifestyle' ];
        fieldsToFormat.forEach(id => {
            const input = document.getElementById(id);
            if(input) {
                // Al salir del campo, formatear el número.
                input.addEventListener('blur', () => { if(input.value) input.value = formatForDisplay(parseFormattedNumber(input.value)); });
                // Al entrar en el campo, quitar el formato para editar.
                input.addEventListener('focus', () => { if(input.value) input.value = parseFormattedNumber(input.value); });
            }
        });

        // Asigna los listeners a los inputs del dashboard para el recálculo en tiempo real.
        document.querySelectorAll('#rc-dashboard input').forEach(input => {
            input.addEventListener('input', calculateAndRender);
        });
        
        // Establece el estado inicial de la barra de progreso.
        updateProgress();
    }
    
    // Ejecutar la función de inicialización para arrancar el widget.
    initializeWidget();

})();
