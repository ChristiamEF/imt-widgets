/**
* =================================================================================
* WIDGET CALCULADORA DE DEUDAS v1.0 (Estrategia Bola de Nieve)
* Creado para ser seguro, embedible y responsive.
* ---------------------------------------------------------------------------------
* Este script crea una calculadora de deudas interactiva dentro de un div específico.
* Permite al usuario registrar múltiples deudas, analizar su situación financiera
* y simular la estrategia "Bola de Nieve" para acelerar el pago de deudas.
* 
* CARACTERÍSTICAS PRINCIPALES:
* • Wizard de 3 pasos: Registro → Análisis → Estrategias
* • Validación de entradas con sanitización XSS
* • Cálculos financieros precisos (amortización, intereses)
* • Visualización interactiva con gráficos comparativos
* • Almacenamiento local seguro (localStorage)
* • Diseño responsive y accesible
* • Completamente autocontenido (sin interferencia con página host)
* 
* ALGORITMOS FINANCIEROS:
* • Cálculo de pagos mensuales con fórmula de amortización
* • Simulación de estrategia "Snowball" (menor a mayor saldo)
* • Comparación temporal y de costos entre escenarios
* • Proyección de ahorro en tiempo e intereses
* 
* SEGURIDAD:
* • 100% client-side (sin envío de datos a servidores)
* • Sanitización de entradas de usuario
* • Validación estricta de números y rangos
* • Namespace único para evitar conflictos
* • Prefijos CSS para aislamiento de estilos
* 
* DEPENDENCIAS EXTERNAS:
* • Chart.js v3.9.1+ (https://www.chartjs.org/)
*   - Se carga dinámicamente desde CDN
*   - Opcional: el widget funciona sin gráficos si falla la carga
*   - URL: https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js
* 
* COMPATIBILIDAD:
* • Navegadores modernos (ES6+)
* • Dispositivos móviles y desktop
* • No requiere jQuery ni otras librerías
* 
* USO BÁSICO:
* <!-- HTML -->
* <div id="imt-debt-calculator-widget"></div>
* <script src="debt-calculator-widget.js"></script>
* 
* // JavaScript (inicialización manual)
* const widget = window['imt-debt-calculator'].init('mi-contenedor-personalizado');
* 
* ESTRUCTURA DE DATOS:
* Cada deuda contiene: {
*   id: timestamp único,
*   creditorName: string sanitizado,
*   debtReference: string sanitizado,
*   currentBalance: number validado,
*   annualRate: number (0-100),
*   monthlyRate: number calculado,
*   remainingTerm: integer (1-600 meses),
*   minimumPayment: number validado
* }
* 
* AUTOR: It's Money Time Team
* LICENCIA: MIT
* =================================================================================
*/

(function() {
    'use strict';
    
    // Namespace único para evitar conflictos
    const WIDGET_ID = 'imt-debt-calculator';
    const PREFIX = 'imt-dc-';
    
    // Configuración del widget
    const CONFIG = {
        cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
        version: '1.0.0'
    };

    // Utilidades de seguridad
    const Security = {
        // Sanitizar entrada de texto
        sanitizeText: function(text) {
            if (typeof text !== 'string') return '';
            return text.replace(/[<>'"&]/g, function(match) {
                const map = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;',
                    '&': '&amp;'
                };
                return map[match];
            });
        },

        // Validar número
        validateNumber: function(value, min = 0, max = Infinity) {
            const num = parseFloat(value);
            if (isNaN(num) || !isFinite(num)) return null;
            return Math.max(min, Math.min(max, num));
        },

        // Validar entero
        validateInteger: function(value, min = 0, max = Infinity) {
            const num = parseInt(value);
            if (isNaN(num) || !isFinite(num)) return null;
            return Math.max(min, Math.min(max, num));
        }
    };

    // CSS del widget
    const CSS = `
        .${PREFIX}widget-container {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 20px auto;
            background: white;
            border: 2px solid #000;
            border-radius: 24px;
            box-shadow: 8px 8px 0px #000;
            overflow: hidden;
            color: #333;
            line-height: 1.6;
        }

        .${PREFIX}header {
            background: #000;
            color: white;
            padding: 20px;
            text-align: center;
        }

        .${PREFIX}header h1 {
            margin: 0 0 5px 0;
            font-size: 1.8rem;
            font-weight: bold;
        }

        .${PREFIX}header p {
            margin: 0;
            opacity: 0.9;
            font-size: 0.9rem;
        }

        .${PREFIX}content {
            padding: 30px;
        }

        .${PREFIX}step-indicator {
            display: flex;
            justify-content: center;
            margin-bottom: 30px;
            gap: 10px;
        }

        .${PREFIX}step {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background: #f0f0f0;
            color: #999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            border: 2px solid #ddd;
            position: relative;
        }

        .${PREFIX}step.active {
            background: #000;
            color: white;
            border-color: #000;
        }

        .${PREFIX}step.completed {
            background: #666;
            color: white;
            border-color: #666;
        }

        .${PREFIX}form-section {
            margin-bottom: 25px;
        }

        .${PREFIX}section-title {
            font-size: 1.3rem;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #000;
        }

        .${PREFIX}form-group {
            margin-bottom: 20px;
        }

        .${PREFIX}form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #000;
        }

        .${PREFIX}form-group input,
        .${PREFIX}form-group select {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s;
        }

        .${PREFIX}form-group input:focus,
        .${PREFIX}form-group select:focus {
            outline: none;
            border-color: #000;
        }

        .${PREFIX}help-text {
            font-size: 0.85rem;
            color: #666;
            margin-top: 3px;
        }

        .${PREFIX}btn {
            background: #000;
            color: white;
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-right: 10px;
        }

        .${PREFIX}btn:hover {
            background: #333;
            transform: translateY(-2px);
        }

        .${PREFIX}btn-secondary {
            background: #666;
        }

        .${PREFIX}btn-secondary:hover {
            background: #555;
        }

        .${PREFIX}two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .${PREFIX}debt-summary {
            background: #f8f8f8;
            padding: 20px;
            border-radius: 12px;
            margin-top: 20px;
            border: 1px solid #ddd;
        }

        .${PREFIX}debt-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: white;
            border-radius: 8px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
        }

        .${PREFIX}summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }

        .${PREFIX}summary-card {
            background: #f8f8f8;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid #ddd;
        }

        .${PREFIX}summary-card h3 {
            color: #666;
            font-size: 0.8rem;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .${PREFIX}summary-card .value {
            font-size: 1.8rem;
            font-weight: bold;
            color: #000;
            margin-bottom: 5px;
        }

        .${PREFIX}chart-container {
            margin: 20px 0;
            padding: 20px;
            background: #f8f8f8;
            border-radius: 12px;
            border: 1px solid #ddd;
        }

        .${PREFIX}chart-wrapper {
            position: relative;
            height: 300px;
        }

        .${PREFIX}error {
            color: #d63384;
            font-size: 0.85rem;
            margin-top: 3px;
        }

        .${PREFIX}loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }

        .${PREFIX}navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 25px;
            gap: 10px;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .${PREFIX}widget-container {
                margin: 10px;
                border-radius: 16px;
            }
            
            .${PREFIX}content {
                padding: 20px;
            }
            
            .${PREFIX}two-column {
                grid-template-columns: 1fr;
            }
            
            .${PREFIX}navigation {
                flex-direction: column;
            }
            
            .${PREFIX}header h1 {
                font-size: 1.5rem;
            }
        }
    `;

    // HTML Templates
    const Templates = {
        main: function() {
            return `
                <div class="${PREFIX}widget-container">
                    <div class="${PREFIX}header">
                        <h1>🐷 Calculadora de Deudas</h1>
                        <p>Toma el control de tus deudas y encuentra tu camino hacia la libertad financiera</p>
                    </div>
                    <div class="${PREFIX}content">
                        <div class="${PREFIX}step-indicator">
                            <div class="${PREFIX}step active" id="${PREFIX}step1">1</div>
                            <div class="${PREFIX}step" id="${PREFIX}step2">2</div>
                            <div class="${PREFIX}step" id="${PREFIX}step3">3</div>
                        </div>
                        <div id="${PREFIX}step-content"></div>
                    </div>
                </div>
            `;
        },

        step1: function() {
            return `
                <div class="${PREFIX}form-section">
                    <h2 class="${PREFIX}section-title">📋 Información de la Deuda</h2>
                    
                    <div class="${PREFIX}form-group">
                        <label for="${PREFIX}creditor">¿A quién le debes? *</label>
                        <input type="text" id="${PREFIX}creditor" required placeholder="Ej: Banco Santander">
                        <div class="${PREFIX}help-text">Nombre del banco o entidad financiera</div>
                    </div>

                    <div class="${PREFIX}form-group">
                        <label for="${PREFIX}reference">Referencia de la deuda *</label>
                        <input type="text" id="${PREFIX}reference" required placeholder="Ej: Tarjeta de crédito">
                        <div class="${PREFIX}help-text">Un nombre para recordar esta deuda</div>
                    </div>

                    <div class="${PREFIX}form-group">
                        <label for="${PREFIX}balance">Saldo actual (€) *</label>
                        <input type="number" id="${PREFIX}balance" required min="0" step="0.01" placeholder="15000">
                        <div class="${PREFIX}help-text">¿Cuánto debes en total?</div>
                    </div>

                    <div class="${PREFIX}two-column">
                        <div class="${PREFIX}form-group">
                            <label for="${PREFIX}rate">Tasa de interés anual (%) *</label>
                            <input type="number" id="${PREFIX}rate" required min="0" max="100" step="0.01" placeholder="12.5">
                            <div class="${PREFIX}help-text">Ejemplo: 12.5</div>
                        </div>

                        <div class="${PREFIX}form-group">
                            <label for="${PREFIX}term">Plazo restante (meses) *</label>
                            <input type="number" id="${PREFIX}term" required min="1" placeholder="36">
                            <div class="${PREFIX}help-text">¿Cuántos meses faltan?</div>
                        </div>
                    </div>

                    <div class="${PREFIX}form-group">
                        <label for="${PREFIX}payment">Pago mensual (€) *</label>
                        <input type="number" id="${PREFIX}payment" required min="0" step="0.01" placeholder="450">
                        <div class="${PREFIX}help-text">¿Cuánto pagas cada mes?</div>
                    </div>

                    <div class="${PREFIX}navigation">
                        <div></div>
                        <button class="${PREFIX}btn" onclick="window.${WIDGET_ID}.addDebt()">➕ Agregar Deuda</button>
                    </div>
                </div>

                <div id="${PREFIX}debt-summary" class="${PREFIX}debt-summary" style="display: none;">
                    <h3>📋 Deudas Agregadas</h3>
                    <div id="${PREFIX}debt-list"></div>
                    <div style="margin-top: 15px; text-align: center;">
                        <button class="${PREFIX}btn ${PREFIX}btn-secondary" onclick="window.${WIDGET_ID}.addAnother()">📝 Agregar Otra</button>
                        <button class="${PREFIX}btn" onclick="window.${WIDGET_ID}.goToStep(2)">➡️ Analizar</button>
                    </div>
                </div>
            `;
        },

        step2: function() {
            return `
                <div class="${PREFIX}summary-cards">
                    <div class="${PREFIX}summary-card">
                        <h3>Total a Pagar</h3>
                        <div class="value" id="${PREFIX}total-pay">€0</div>
                    </div>
                    <div class="${PREFIX}summary-card">
                        <h3>Total Intereses</h3>
                        <div class="value" id="${PREFIX}total-interest">€0</div>
                    </div>
                    <div class="${PREFIX}summary-card">
                        <h3>Tiempo Libre</h3>
                        <div class="value" id="${PREFIX}time-free">0 años</div>
                    </div>
                    <div class="${PREFIX}summary-card">
                        <h3>Tasa Promedio</h3>
                        <div class="value" id="${PREFIX}avg-rate">0%</div>
                    </div>
                </div>

                <div class="${PREFIX}chart-container">
                    <h3 style="text-align: center; margin-bottom: 15px;">📈 Evolución del Saldo</h3>
                    <div class="${PREFIX}chart-wrapper">
                        <canvas id="${PREFIX}debt-chart"></canvas>
                    </div>
                </div>

                <div class="${PREFIX}navigation">
                    <button class="${PREFIX}btn ${PREFIX}btn-secondary" onclick="window.${WIDGET_ID}.goToStep(1)">← Editar Deudas</button>
                    <button class="${PREFIX}btn" onclick="window.${WIDGET_ID}.goToStep(3)">Ver Estrategias →</button>
                </div>
            `;
        },

        step3: function() {
            return `
                <div class="${PREFIX}form-section">
                    <h2 class="${PREFIX}section-title">❄️ Estrategia Bola de Nieve</h2>
                    <p style="margin-bottom: 20px;">Paga el mínimo en todas las deudas y destina dinero extra a la más pequeña.</p>
                    
                    <div class="${PREFIX}form-group">
                        <label for="${PREFIX}extra-monthly">Pago adicional mensual (€)</label>
                        <input type="number" id="${PREFIX}extra-monthly" min="0" step="10" placeholder="100" value="100">
                        <div class="${PREFIX}help-text">¿Cuánto extra puedes pagar cada mes?</div>
                    </div>

                    <button class="${PREFIX}btn" onclick="window.${WIDGET_ID}.calculateStrategy()">🔄 Calcular Estrategia</button>
                </div>

                <div id="${PREFIX}strategy-results" style="display: none;">
                    <div class="${PREFIX}summary-cards">
                        <div class="${PREFIX}summary-card">
                            <h3>Situación Actual</h3>
                            <div class="value" id="${PREFIX}current-time">0 años</div>
                            <div style="font-size: 0.9rem; color: #666;" id="${PREFIX}current-interest">€0 intereses</div>
                        </div>
                        <div class="${PREFIX}summary-card" style="background: #e6f3ff;">
                            <h3>Con Bola de Nieve</h3>
                            <div class="value" id="${PREFIX}strategy-time">0 años</div>
                            <div style="font-size: 0.9rem; color: #666;" id="${PREFIX}strategy-interest">€0 intereses</div>
                        </div>
                    </div>

                    <div style="background: #000; color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
                        <h3 style="margin-bottom: 10px;">🎉 Tu Ahorro Total</h3>
                        <div style="font-size: 2rem; font-weight: bold;" id="${PREFIX}total-savings">€0</div>
                        <div id="${PREFIX}savings-detail">0 años menos + €0 menos en intereses</div>
                    </div>

                    <div class="${PREFIX}chart-container">
                        <h3 style="text-align: center; margin-bottom: 15px;">📈 Comparación de Estrategias</h3>
                        <div class="${PREFIX}chart-wrapper">
                            <canvas id="${PREFIX}comparison-chart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="${PREFIX}navigation">
                    <button class="${PREFIX}btn ${PREFIX}btn-secondary" onclick="window.${WIDGET_ID}.goToStep(2)">← Ver Análisis</button>
                    <button class="${PREFIX}btn" onclick="window.${WIDGET_ID}.resetWidget()">🔄 Reiniciar</button>
                </div>
            `;
        }
    };

    // Clase principal del widget
    class DebtCalculatorWidget {
        constructor(containerId) {
            this.containerId = containerId;
            this.currentStep = 1;
            this.debts = [];
            this.charts = {};
            this.storageKey = PREFIX + 'debts-' + containerId;
            
            this.init();
        }

        init() {
            this.injectCSS();
            this.render();
            this.loadChartJS();
            this.loadSavedData();
        }

        injectCSS() {
            if (!document.getElementById(PREFIX + 'styles')) {
                const style = document.createElement('style');
                style.id = PREFIX + 'styles';
                style.textContent = CSS;
                document.head.appendChild(style);
            }
        }

        render() {
            const container = document.getElementById(this.containerId);
            if (!container) {
                console.error(`Container with id "${this.containerId}" not found`);
                return;
            }
            container.innerHTML = Templates.main();
            this.renderStep(this.currentStep);
        }

        renderStep(step) {
            const content = document.getElementById(PREFIX + 'step-content');
            if (!content) return;

            // Actualizar indicadores
            document.querySelectorAll(`.${PREFIX}step`).forEach((el, index) => {
                el.className = `${PREFIX}step`;
                if (index + 1 < step) el.classList.add('completed');
                if (index + 1 === step) el.classList.add('active');
            });

            // Renderizar contenido del paso
            switch(step) {
                case 1:
                    content.innerHTML = Templates.step1();
                    this.updateDebtSummary();
                    break;
                case 2:
                    content.innerHTML = Templates.step2();
                    this.calculateAnalysis();
                    break;
                case 3:
                    content.innerHTML = Templates.step3();
                    break;
            }
        }

        // Validación segura de datos
        validateDebtInput() {
            const creditor = Security.sanitizeText(document.getElementById(PREFIX + 'creditor').value);
            const reference = Security.sanitizeText(document.getElementById(PREFIX + 'reference').value);
            const balance = Security.validateNumber(document.getElementById(PREFIX + 'balance').value, 0.01);
            const rate = Security.validateNumber(document.getElementById(PREFIX + 'rate').value, 0, 100);
            const term = Security.validateInteger(document.getElementById(PREFIX + 'term').value, 1, 600);
            const payment = Security.validateNumber(document.getElementById(PREFIX + 'payment').value, 0.01);

            // Limpiar errores previos
            document.querySelectorAll(`.${PREFIX}error`).forEach(el => el.remove());

            let isValid = true;
            const errors = [];

            if (!creditor.trim()) {
                errors.push({ field: PREFIX + 'creditor', message: 'El acreedor es obligatorio' });
                isValid = false;
            }

            if (!reference.trim()) {
                errors.push({ field: PREFIX + 'reference', message: 'La referencia es obligatoria' });
                isValid = false;
            }

            if (balance === null) {
                errors.push({ field: PREFIX + 'balance', message: 'Saldo inválido' });
                isValid = false;
            }

            if (rate === null) {
                errors.push({ field: PREFIX + 'rate', message: 'Tasa inválida' });
                isValid = false;
            }

            if (term === null) {
                errors.push({ field: PREFIX + 'term', message: 'Plazo inválido' });
                isValid = false;
            }

            if (payment === null) {
                errors.push({ field: PREFIX + 'payment', message: 'Pago inválido' });
                isValid = false;
            }

            // Mostrar errores
            errors.forEach(error => {
                const field = document.getElementById(error.field);
                const errorEl = document.createElement('div');
                errorEl.className = PREFIX + 'error';
                errorEl.textContent = error.message;
                field.parentNode.appendChild(errorEl);
                field.style.borderColor = '#d63384';
            });

            if (isValid) {
                return { creditor, reference, balance, rate, term, payment };
            }

            return null;
        }

        addDebt() {
            const data = this.validateDebtInput();
            if (!data) return;

            const debt = {
                id: Date.now(),
                creditorName: data.creditor,
                debtReference: data.reference,
                currentBalance: data.balance,
                annualRate: data.rate,
                monthlyRate: data.rate / 12,
                remainingTerm: data.term,
                minimumPayment: data.payment,
                dateAdded: new Date().toISOString()
            };

            this.debts.push(debt);
            this.saveData();
            this.clearForm();
            this.updateDebtSummary();
        }

        clearForm() {
            ['creditor', 'reference', 'balance', 'rate', 'term', 'payment'].forEach(field => {
                const element = document.getElementById(PREFIX + field);
                if (element) element.value = '';
            });

            // Limpiar errores
            document.querySelectorAll(`.${PREFIX}error`).forEach(el => el.remove());
            document.querySelectorAll('input').forEach(el => el.style.borderColor = '');
        }

        updateDebtSummary() {
            const summary = document.getElementById(PREFIX + 'debt-summary');
            const list = document.getElementById(PREFIX + 'debt-list');
            
            if (!summary || !list) return;

            if (this.debts.length === 0) {
                summary.style.display = 'none';
                return;
            }

            summary.style.display = 'block';
            list.innerHTML = '';

            let total = 0;
            this.debts.forEach((debt, index) => {
                total += debt.currentBalance;
                
                const item = document.createElement('div');
                item.className = PREFIX + 'debt-item';
                item.innerHTML = `
                    <div>
                        <strong>${debt.debtReference}</strong><br>
                        <small>${debt.creditorName} - ${debt.annualRate.toFixed(2)}%</small>
                    </div>
                    <div style="text-align: right;">
                        <strong>€${debt.currentBalance.toLocaleString()}</strong><br>
                        <button onclick="window.${WIDGET_ID}.removeDebt(${debt.id})" style="background: #666; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">✕</button>
                    </div>
                `;
                list.appendChild(item);
            });

            const totalEl = document.createElement('div');
            totalEl.style.textAlign = 'center';
            totalEl.style.marginTop = '15px';
            totalEl.style.fontWeight = 'bold';
            totalEl.innerHTML = `Total: €${total.toLocaleString()}`;
            list.appendChild(totalEl);
        }

        removeDebt(debtId) {
            this.debts = this.debts.filter(debt => debt.id !== debtId);
            this.saveData();
            this.updateDebtSummary();
        }

        addAnother() {
            this.clearForm();
        }

        goToStep(step) {
            if (step === 2 && this.debts.length === 0) {
                alert('Agrega al menos una deuda antes de continuar');
                return;
            }

            this.currentStep = step;
            this.renderStep(step);
        }

        // Cálculos financieros
        calculateTotalPayment(debt) {
            return debt.minimumPayment * debt.remainingTerm;
        }

        calculateTotalInterest(debt) {
            return this.calculateTotalPayment(debt) - debt.currentBalance;
        }

        calculateAnalysis() {
            if (this.debts.length === 0) return;

            let totalCapital = 0;
            let totalToPay = 0;
            let totalInterest = 0;
            let weightedRate = 0;
            let maxMonths = 0;

            this.debts.forEach(debt => {
                totalCapital += debt.currentBalance;
                const debtTotal = this.calculateTotalPayment(debt);
                totalToPay += debtTotal;
                totalInterest += this.calculateTotalInterest(debt);
                weightedRate += debt.annualRate * debt.currentBalance;
                maxMonths = Math.max(maxMonths, debt.remainingTerm);
            });

            const averageRate = weightedRate / totalCapital;
            const timeInYears = Math.round((maxMonths / 12) * 10) / 10;

            // Actualizar UI
            this.updateElement(PREFIX + 'total-pay', `€${Math.round(totalToPay).toLocaleString()}`);
            this.updateElement(PREFIX + 'total-interest', `€${Math.round(totalInterest).toLocaleString()}`);
            this.updateElement(PREFIX + 'time-free', `${timeInYears} años`);
            this.updateElement(PREFIX + 'avg-rate', `${averageRate.toFixed(2)}%`);

            this.renderAnalysisChart();
        }

        calculateStrategy() {
            const extraMonthly = Security.validateNumber(document.getElementById(PREFIX + 'extra-monthly').value, 0) || 0;
            
            // Calcular situación actual
            const current = this.calculateCurrentSituation();
            
            // Calcular estrategia bola de nieve
            const strategy = this.calculateSnowballStrategy(extraMonthly);

            // Mostrar resultados
            document.getElementById(PREFIX + 'strategy-results').style.display = 'block';

            this.updateElement(PREFIX + 'current-time', `${current.years} años`);
            this.updateElement(PREFIX + 'current-interest', `€${Math.round(current.totalInterest).toLocaleString()} intereses`);
            this.updateElement(PREFIX + 'strategy-time', `${strategy.years} años`);
            this.updateElement(PREFIX + 'strategy-interest', `€${Math.round(strategy.totalInterest).toLocaleString()} intereses`);

            const timeSaved = current.years - strategy.years;
            const moneySaved = current.totalInterest - strategy.totalInterest;

            this.updateElement(PREFIX + 'total-savings', `€${Math.round(moneySaved).toLocaleString()}`);
            this.updateElement(PREFIX + 'savings-detail', `${Math.round(timeSaved * 10) / 10} años menos + €${Math.round(moneySaved).toLocaleString()} menos en intereses`);

            this.renderComparisonChart(current, strategy);
        }

        calculateCurrentSituation() {
            let totalInterest = 0;
            let maxMonths = 0;

            this.debts.forEach(debt => {
                const monthlyRate = debt.monthlyRate / 100;
                const payment = debt.minimumPayment;
                
                let balance = debt.currentBalance;
                let months = 0;
                let interestPaid = 0;

                while (balance > 0.01 && months < 600) {
                    const interestPayment = balance * monthlyRate;
                    const principalPayment = payment - interestPayment;
                    
                    if (principalPayment <= 0) {
                        months = 600;
                        break;
                    }
                    
                    balance -= principalPayment;
                    interestPaid += interestPayment;
                    months++;
                }

                totalInterest += interestPaid;
                maxMonths = Math.max(maxMonths, months);
            });

            return {
                months: maxMonths,
                years: Math.round((maxMonths / 12) * 10) / 10,
                totalInterest: totalInterest
            };
        }

        calculateSnowballStrategy(extraMonthly) {
            // Ordenar deudas por saldo (menor a mayor)
            const sortedDebts = [...this.debts].sort((a, b) => a.currentBalance - b.currentBalance);
            
            let simulationDebts = sortedDebts.map(debt => ({
                ...debt,
                balance: debt.currentBalance
            }));

            let month = 0;
            let totalInterestPaid = 0;
            let currentExtraPayment = extraMonthly;

            while (simulationDebts.some(debt => debt.balance > 0.01) && month < 600) {
                month++;
                
                // Pagar intereses y mínimos en todas las deudas
                simulationDebts.forEach(debt => {
                    if (debt.balance > 0.01) {
                        const monthlyRate = debt.monthlyRate / 100;
                        const interestPayment = debt.balance * monthlyRate;
                        const minimumPayment = debt.minimumPayment;
                        const principalPayment = minimumPayment - interestPayment;

                        debt.balance -= principalPayment;
                        totalInterestPaid += interestPayment;

                        if (debt.balance < 0) debt.balance = 0;
                    }
                });

                // Encontrar la deuda más pequeña con saldo
                const targetDebt = simulationDebts
                    .filter(debt => debt.balance > 0.01)
                    .sort((a, b) => a.balance - b.balance)[0];

                if (targetDebt && currentExtraPayment > 0) {
                    // Aplicar pago extra
                    const previousBalance = targetDebt.balance;
                    targetDebt.balance -= currentExtraPayment;
                    if (targetDebt.balance < 0) targetDebt.balance = 0;

                    // Si se liquidó una deuda, sumar su pago al extra
                    if (previousBalance > 0 && targetDebt.balance === 0) {
                        currentExtraPayment += targetDebt.minimumPayment;
                    }
                }
            }

            return {
                months: month,
                years: Math.round((month / 12) * 10) / 10,
                totalInterest: totalInterestPaid
            };
        }

        renderAnalysisChart() {
            if (typeof Chart === 'undefined') return;

            const ctx = document.getElementById(PREFIX + 'debt-chart');
            if (!ctx) return;

            // Destruir gráfico anterior
            if (this.charts.analysis) {
                this.charts.analysis.destroy();
            }

            const maxMonths = Math.max(...this.debts.map(d => d.remainingTerm));
            const labels = [];
            for (let i = 0; i <= maxMonths; i += 6) {
                labels.push(i === 0 ? 'Hoy' : `${Math.round(i/12)}a`);
            }

            const datasets = this.debts.map((debt, index) => {
                const data = [];
                let balance = debt.currentBalance;
                const monthlyRate = debt.monthlyRate / 100;
                const payment = debt.minimumPayment;

                data.push(balance);

                for (let month = 1; month <= maxMonths; month++) {
                    if (month <= debt.remainingTerm && balance > 0) {
                        const interestPayment = balance * monthlyRate;
                        const principalPayment = payment - interestPayment;
                        balance = Math.max(0, balance - principalPayment);
                    }
                    if (month % 6 === 0) data.push(balance);
                }

                return {
                    label: debt.debtReference,
                    data: data,
                    borderColor: this.getChartColor(index),
                    backgroundColor: this.getChartColor(index, 0.1),
                    borderWidth: 2,
                    fill: false
                };
            });

            this.charts.analysis = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'bottom' }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '€' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }

        renderComparisonChart(current, strategy) {
            if (typeof Chart === 'undefined') return;

            const ctx = document.getElementById(PREFIX + 'comparison-chart');
            if (!ctx) return;

            if (this.charts.comparison) {
                this.charts.comparison.destroy();
            }

            const maxMonths = Math.max(current.months, strategy.months);
            const labels = [];
            for (let i = 0; i <= maxMonths; i += 6) {
                labels.push(i === 0 ? 'Hoy' : `${Math.round(i/12)}a`);
            }

            // Datos simplificados para comparación
            const totalBalance = this.debts.reduce((sum, debt) => sum + debt.currentBalance, 0);
            
            const currentData = [];
            const strategyData = [];
            
            for (let i = 0; i <= maxMonths; i += 6) {
                const currentProgress = Math.min(i / current.months, 1);
                const strategyProgress = Math.min(i / strategy.months, 1);
                
                currentData.push(totalBalance * (1 - currentProgress));
                strategyData.push(totalBalance * (1 - strategyProgress));
            }

            this.charts.comparison = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Situación Actual',
                            data: currentData,
                            borderColor: '#666',
                            backgroundColor: 'rgba(102, 102, 102, 0.1)',
                            borderWidth: 2,
                            fill: false
                        },
                        {
                            label: 'Bola de Nieve',
                            data: strategyData,
                            borderColor: '#000',
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            borderWidth: 3,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'bottom' }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '€' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }

        getChartColor(index, alpha = 1) {
            const colors = [
                `rgba(0, 0, 0, ${alpha})`,
                `rgba(102, 102, 102, ${alpha})`,
                `rgba(153, 153, 153, ${alpha})`,
                `rgba(204, 204, 204, ${alpha})`,
                `rgba(68, 68, 68, ${alpha})`
            ];
            return colors[index % colors.length];
        }

        updateElement(id, content) {
            const element = document.getElementById(id);
            if (element) element.textContent = content;
        }

        // Gestión de datos
        saveData() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.debts));
            } catch (e) {
                console.warn('No se pudo guardar en localStorage:', e);
            }
        }

        loadSavedData() {
            try {
                const saved = localStorage.getItem(this.storageKey);
                if (saved) {
                    this.debts = JSON.parse(saved);
                    this.updateDebtSummary();
                }
            } catch (e) {
                console.warn('No se pudo cargar datos guardados:', e);
                this.debts = [];
            }
        }

        resetWidget() {
            if (confirm('¿Estás seguro de que quieres reiniciar? Se perderán todos los datos.')) {
                this.debts = [];
                this.currentStep = 1;
                localStorage.removeItem(this.storageKey);
                
                // Destruir gráficos
                Object.values(this.charts).forEach(chart => {
                    if (chart && typeof chart.destroy === 'function') {
                        chart.destroy();
                    }
                });
                this.charts = {};
                
                this.renderStep(1);
            }
        }

        // Carga de Chart.js
        loadChartJS() {
            if (typeof Chart !== 'undefined') return;

            const script = document.createElement('script');
            script.src = CONFIG.cdnUrl;
            script.onload = () => {
                console.log('Chart.js cargado correctamente');
            };
            script.onerror = () => {
                console.warn('No se pudo cargar Chart.js - los gráficos no estarán disponibles');
            };
            document.head.appendChild(script);
        }
    }

    // Función de inicialización global
    window[WIDGET_ID] = {
        init: function(containerId) {
            if (!containerId) {
                console.error('Se requiere un ID de contenedor');
                return null;
            }
            
            const widget = new DebtCalculatorWidget(containerId);
            
            // Exponer métodos públicos
            return {
                addDebt: () => widget.addDebt(),
                removeDebt: (id) => widget.removeDebt(id),
                addAnother: () => widget.addAnother(),
                goToStep: (step) => widget.goToStep(step),
                calculateStrategy: () => widget.calculateStrategy(),
                resetWidget: () => widget.resetWidget()
            };
        },
        
        // Métodos accesibles globalmente para eventos onclick
        addDebt: function() { /* Se asigna dinámicamente */ },
        removeDebt: function(id) { /* Se asigna dinámicamente */ },
        addAnother: function() { /* Se asigna dinámicamente */ },
        goToStep: function(step) { /* Se asigna dinámicamente */ },
        calculateStrategy: function() { /* Se asigna dinámicamente */ },
        resetWidget: function() { /* Se asigna dinámicamente */ }
    };

    // Auto-inicialización si existe el contenedor por defecto
    document.addEventListener('DOMContentLoaded', function() {
        const defaultContainer = document.getElementById('imt-debt-calculator-widget');
        if (defaultContainer) {
            const widget = window[WIDGET_ID].init('imt-debt-calculator-widget');
            if (widget) {
                // Asignar métodos a la interfaz global
                Object.assign(window[WIDGET_ID], widget);
            }
        }
    });

})();
