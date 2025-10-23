/**
 * =================================================================================
 * WIDGET CALCULADORA DE FUGAS FINANCIERAS v2.1 (Formato Legible)
 * Creado para ser seguro, robusto, embedible y sin dependencias.
 * ---------------------------------------------------------------------------------
 * Este script crea una calculadora interactiva de "fugas financieras" dentro
 * de un div específico en una página web. Su diseño se centra en la máxima
 * seguridad y aislamiento para evitar conflictos con el sitio anfitrión.
 *
 * Principales Características de Seguridad:
 * - Namespace único para evitar colisiones de CSS e IDs.
 * - Validación de origen para restringir la ejecución a dominios autorizados.
 * - Sanitización de todas las entradas del usuario para prevenir XSS.
 * - Validación estricta de rangos numéricos para evitar DoS y overflows.
 * - Aislamiento completo del scope global mediante una IIFE y una clase.
 * - Cero dependencias externas.
 * =================================================================================
 */

// Se encapsula todo el código en una IIFE (Immediately Invoked Function Expression).
// Esto crea un scope privado, evitando que nuestras variables y funciones
// contaminen el scope global de la página donde se inserte el widget.
(function(window, document) {
    'use strict';

    // Se genera un namespace (prefijo) único para esta instancia del widget.
    // Esto es crucial para que los estilos y IDs no colisionen con la página anfitriona.
    const WIDGET_NAMESPACE = 'imt_ffc_' + Date.now();

    /**
     * Objeto de configuración centralizado para la seguridad.
     * Define todos los límites y valores seguros para las entradas del usuario.
     */
    const SECURITY_CONFIG = {
        // Dejar el array vacío [] para permitir la ejecución en cualquier dominio.
        ALLOWED_DOMAINS: ['itsmoneytime.co'],
        
        savings:  { min: 0, max: 100000000 }, // 100 Millones
        spending: { min: 0, max: 100000000 },    // 100 Millones
        debt:     { min: 0, max: 10000000000 },  // 10 Mil Millones
        interest: { min: 0, max: 100 },
        years:    { min: 1, max: 100 }
    };
    
    /**
     * Clase principal del Widget.
     * Encapsula toda la lógica, el estado y la manipulación del DOM
     * para mantener el código organizado y contenido.
     */
    class FinancialLeakCalculator {

        constructor(containerId) {
            this.container = document.getElementById(containerId);
            if (!this.container) {
                console.error(`IMT Widget Error: Container con ID "${containerId}" no encontrado.`);
                return;
            }

            this.namespace = WIDGET_NAMESPACE;
            this.currentStep = 0;
            this.totalInputSteps = 4;
            this.dom = {}; // Objeto para almacenar referencias a elementos del DOM.
            
            this.init();
        }

        // ========================================================================
        // MÉTODOS DE INICIALIZACIÓN Y CONFIGURACIÓN
        // ========================================================================

        /**
         * Método de inicialización principal.
         * Orquesta la creación del widget en el orden correcto.
         */
        init() {
            try {
                if (!this.isOriginValid()) {
                    console.warn(`IMT Widget: Ejecución no autorizada en el dominio ${window.location.hostname}.`);
                    this.container.innerHTML = `<p style="color:red; font-family:monospace;">Widget no autorizado.</p>`;
                    return;
                }

                this.injectHTMLAndCSS();
                this.queryDOMElements();
                this.setupEventListeners();
                this.navigateToStep(0);

                // Dispara el evento 'blur' en las entradas para formatear los valores iniciales.
                this.dom.inputs.forEach(input => input.dispatchEvent(new Event('blur')));
            } catch (error) {
                console.error('IMT Widget Error de Inicialización:', error);
                this.container.innerHTML = `<p style="color:red;">Error al cargar el widget.</p>`;
            }
        }

        /**
         * Valida que el widget se esté ejecutando en un dominio autorizado.
         */
        isOriginValid() {
            const allowedDomains = SECURITY_CONFIG.ALLOWED_DOMAINS;
            if (!allowedDomains || allowedDomains.length === 0) {
                return true;
            }

            const currentDomain = window.location.hostname;
            if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
                return true;
            }

            return allowedDomains.some(domain =>
                currentDomain === domain || currentDomain.endsWith('.' + domain)
            );
        }

        /**
         * Inyecta el HTML y CSS necesarios en el contenedor del widget.
         */
        injectHTMLAndCSS() {
            const ns = this.namespace;
            const styles = `
                .${ns}-widget-container { font-family: 'Inter', sans-serif; background-color: #fff; color: #1a1a1a; padding: 24px; border: 2px solid #1a1a1a; border-radius: 24px; box-shadow: 0 8px 0 #1a1a1a; max-width: 500px; margin: 0 auto; position: relative; overflow: hidden; }
                .${ns}-widget-container * { box-sizing: border-box; }
                .${ns}-widget-container h2 { margin: 0 0 20px; font-size: 24px; text-align: center; }
                .${ns}-wizard-wrapper { overflow: hidden; position: relative; }
                .${ns}-steps-container { display: flex; transition: transform 0.4s ease-in-out; }
                .${ns}-step { width: 100%; flex-shrink: 0; padding: 5px; }
                .${ns}-input-group { margin-bottom: 18px; }
                .${ns}-input-group label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; }
                .${ns}-input-group input { width: 100%; padding: 12px; border: 2px solid #1a1a1a; border-radius: 12px; font-size: 16px; background-color: #fff; color: #1a1a1a; text-align: right; }
                .${ns}-nav-buttons { display: flex; justify-content: space-between; margin-top: 24px; }
                .${ns}-button { padding: 12px 20px; border: 2px solid #1a1a1a; border-radius: 12px; background-color: #fff; color: #1a1a1a; font-size: 16px; font-weight: 700; cursor: pointer; transition: all .2s ease; box-shadow: 0 4px 0 #1a1a1a; }
                .${ns}-button:hover { transform: translateY(-2px); box-shadow: 0 6px 0 #1a1a1a; }
                .${ns}-results-section { text-align: center; }
                .${ns}-total-leak { font-size: 36px; font-weight: 800; color: #c63595; margin: 10px 0; }
                .${ns}-breakdown { margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 12px; text-align: left; }
                .${ns}-breakdown p { margin: 8px 0; display: flex; justify-content: space-between; }
                .${ns}-projection-value { font-size: 36px; font-weight: 800; color: #124ab4; margin: 10px 0; }
            `;
            
            const styleSheet = document.createElement("style");
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
            
            this.container.innerHTML = this.createSecureHTML();
        }

        /**
         * Almacena referencias a los elementos del DOM más utilizados para
         * evitar búsquedas repetitivas en el DOM, mejorando el rendimiento.
         */
        queryDOMElements() {
            this.dom = {
                stepsContainer: this.container.querySelector(`.${this.namespace}-steps-container`),
                
                // LÍNEA AÑADIDA: Guardamos una lista de todos los contenedores de los pasos.
                steps: this.container.querySelectorAll(`.${this.namespace}-step`),

                prevBtn: this.container.querySelector(`.${this.namespace}-prev-btn`),
                nextBtn: this.container.querySelector(`.${this.namespace}-next-btn`),
                restartBtn: this.container.querySelector(`.${this.namespace}-restart-btn`),
                inputs: this.container.querySelectorAll(`.${this.namespace}-input-group input`),
                outputs: {
                    totalLeak: this.container.querySelector(`[data-id="total-leak-output"]`),
                    opportunityLeak: this.container.querySelector(`[data-id="opportunity-leak-output"]`),
                    spendingLeak: this.container.querySelector(`[data-id="spending-leak-output"]`),
                    debtLeak: this.container.querySelector(`[data-id="debt-leak-output"]`),
                    years: this.container.querySelector(`[data-id="years-output"]`),
                    projection: this.container.querySelector(`[data-id="projection-output"]`),
                }
            };
        }

        /**
         * Configura todos los manejadores de eventos para la interacción del usuario.
         */
        setupEventListeners() {
            this.dom.inputs.forEach(input => this.setupSecureInputHandlers(input));
            this.dom.nextBtn.addEventListener('click', () => this.handleNext());
            this.dom.prevBtn.addEventListener('click', () => this.handlePrev());
            this.dom.restartBtn.addEventListener('click', () => this.handleRestart());
        }

        // ========================================================================
        // MÉTODOS DE SEGURIDAD Y MANEJO DE ENTRADAS
        // ========================================================================

        /**
         * Configura manejadores de eventos seguros para cada campo de entrada.
         */
        setupSecureInputHandlers(input) {
            const fieldType = input.dataset.type;
            const limits = SECURITY_CONFIG[fieldType];
            if (!limits) return;

            const formatter = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            
            input.addEventListener('input', e => {
                let sanitized = e.target.value.replace(/[^0-9,]/g, '');
                const parts = sanitized.split(',');
                if (parts.length > 2) {
                    sanitized = parts[0] + ',' + parts.slice(1).join('');
                }
                e.target.value = sanitized;
            });
            
            input.addEventListener('blur', e => {
                const value = this.sanitizeNumber(e.target.value, limits.min, limits.max);
                e.target.value = formatter.format(value);
            });
            
            input.addEventListener('paste', e => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text');
                const sanitized = text.replace(/[^0-9,]/g, '').substr(0, 15);
                e.target.value = sanitized;
            });
        }
        
        /**
         * Convierte un string a un número, lo parsea y lo restringe a límites seguros.
         */
        sanitizeNumber(value, min, max, defaultValue = 0) {
            const parsed = parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
            if (isNaN(parsed) || !isFinite(parsed)) {
                return defaultValue;
            }
            return Math.min(Math.max(parsed, min), max);
        }
        
        /**
         * Sanitiza cualquier string para ser insertado de forma segura en el HTML.
         */
        sanitizeHTML(str) {
            const temp = document.createElement('div');
            temp.textContent = String(str);
            return temp.innerHTML;
        }

        /**
         * ========================================================================
         * NUEVA FUNCIÓN DE ACCESIBILIDAD
         * ========================================================================
         */

        /**
         * Actualiza la accesibilidad del widget, asegurando que solo los elementos
         * del paso activo sean enfocables mediante el teclado (Tab).
         * @param {number} activeStepIndex - El índice del paso que debe estar activo.
         */
        updateAccessibility(activeStepIndex) {
            // Itera sobre todos los divs de los pasos que guardamos anteriormente.
            this.dom.steps.forEach((step, index) => {
                
                // Encuentra todos los elementos que pueden recibir foco dentro de este paso.
                const focusableElements = step.querySelectorAll('input, button');
                
                // Determina si este paso es el que está actualmente activo.
                const isStepActive = (index === activeStepIndex);

                // Aplica o remueve tabindex="-1" a cada elemento enfocable.
                focusableElements.forEach(element => {
                    if (isStepActive) {
                        // Si el paso está activo, el elemento es accesible.
                        // Se remueve el atributo para que siga el flujo natural del DOM.
                        element.removeAttribute('tabindex');
                    } else {
                        // Si el paso está inactivo, el elemento no es accesible con Tab.
                        element.setAttribute('tabindex', '-1');
                    }
                });
            });
        }

        // ========================================================================
        // MÉTODOS DE LÓGICA Y NAVEGACIÓN
        // ========================================================================

        /**
         * Realiza los cálculos de forma segura y actualiza el DOM con los resultados.
         */
        calculateAndShowResults() {
            try {
                const getSecureValue = (dataId) => {
                    const el = this.container.querySelector(`[data-id="${dataId}"]`);
                    const limits = SECURITY_CONFIG[el.dataset.type];
                    return this.sanitizeNumber(el.value, limits.min, limits.max);
                };

                const vals = {
                    savings: getSecureValue('savings'),
                    coffee: getSecureValue('dailyCoffee'),
                    subs: getSecureValue('monthlySubs'),
                    takeout: getSecureValue('weeklyTakeout'),
                    debt: getSecureValue('debtAmount'),
                    interest: getSecureValue('debtInterest'),
                    years: Math.round(getSecureValue('investmentYears'))
                };

                const opportunityLeak = vals.savings * 0.05;
                const spendingLeak = (vals.coffee * 220) + (vals.subs * 12) + (vals.takeout * 52);
                const debtLeak = vals.debt * (vals.interest / 100);
                const totalLeak = opportunityLeak + spendingLeak + debtLeak;

                const rate = 0.06;
                const growthFactor = Math.pow(1 + rate, vals.years);
                let futureValue = 0;
                if (isFinite(growthFactor)) {
                     futureValue = totalLeak * ((growthFactor - 1) / rate);
                }

                const formatter = new Intl.NumberFormat('es-ES', {maximumFractionDigits: 0});
                
                this.dom.outputs.totalLeak.textContent = `${formatter.format(totalLeak)} €`;
                this.dom.outputs.opportunityLeak.textContent = `${formatter.format(opportunityLeak)} €`;
                this.dom.outputs.spendingLeak.textContent = `${formatter.format(spendingLeak)} €`;
                this.dom.outputs.debtLeak.textContent = `${formatter.format(debtLeak)} €`;
                this.dom.outputs.years.textContent = this.sanitizeHTML(vals.years);
                this.dom.outputs.projection.textContent = `${formatter.format(futureValue)} €`;

            } catch (error) {
                console.error("IMT Widget Error de Cálculo:", error);
                this.dom.outputs.totalLeak.textContent = "Error";
            }
        }
        
        /**
         * Mueve el carrusel de pasos a la posición indicada y actualiza la accesibilidad.
         * @param {number} stepIndex - El índice del paso al que se debe navegar.
         */
        navigateToStep(stepIndex) {
            // 1. Mueve la "tira de película" visualmente.
            this.dom.stepsContainer.style.transform = `translateX(-${stepIndex * 100}%)`;
            this.currentStep = stepIndex;

            // 2. Llama a la nueva función para gestionar el foco y la accesibilidad. (LÍNEA AÑADIDA)
            this.updateAccessibility(stepIndex);

            // 3. Actualiza el estado de los botones de navegación.
            this.updateButtons();
        }
        
        /**
         * Actualiza el estado y el texto de los botones de navegación.
         */
        updateButtons() {
            this.dom.prevBtn.style.visibility = this.currentStep > 0 ? 'visible' : 'hidden';
            this.dom.nextBtn.textContent = this.currentStep === this.totalInputSteps - 1 ? 'Calcular' : 'Siguiente';

            const isResultStep = this.currentStep === this.totalInputSteps;
            this.dom.nextBtn.style.display = isResultStep ? 'none' : 'block';
            this.dom.prevBtn.style.display = isResultStep ? 'none' : 'block';
            this.dom.restartBtn.style.display = isResultStep ? 'block' : 'none';
        }
        
        /**
         * Maneja el clic en el botón "Siguiente" / "Calcular".
         */
        handleNext() {
            if (this.currentStep < this.totalInputSteps - 1) {
                this.navigateToStep(this.currentStep + 1);
            } else if (this.currentStep === this.totalInputSteps - 1) {
                this.calculateAndShowResults();
                this.navigateToStep(this.totalInputSteps);
            }
        }
        
        /**
         * Maneja el clic en el botón "Anterior".
         */
        handlePrev() {
            if (this.currentStep > 0) {
                this.navigateToStep(this.currentStep - 1);
            }
        }
        
        /**
         * Maneja el clic en el botón "Volver a empezar".
         */
        handleRestart() {
            this.navigateToStep(0);
        }

        /**
         * Crea el HTML del widget de forma segura.
         */
        createSecureHTML() {
            const ns = this.namespace;
            const createInput = (label, dataId, defaultValue, type) => `
                <div class="${ns}-input-group">
                    <label for="${ns}-${dataId}">${this.sanitizeHTML(label)}</label>
                    <input type="tel" inputmode="decimal" id="${ns}-${dataId}" value="${this.sanitizeHTML(defaultValue)}" data-id="${dataId}" data-type="${type}" autocomplete="off" maxlength="15">
                </div>
            `;
            return `
                <div class="${ns}-widget-container">
                    <h2>Calculadora de Fugas Financieras</h2>
                    <div class="${ns}-wizard-wrapper">
                        <div class="${ns}-steps-container">
                            <div class="${ns}-step">
                                <h3>💸 1. Oportunidades Perdidas</h3>
                                ${createInput('Ahorros sin invertir (€)', 'savings', '5.000', 'savings')}
                            </div>
                            <div class="${ns}-step">
                                <h3>☕ 2. Gastos Recurrentes</h3>
                                ${createInput('Cafés y antojos diarios (€)', 'dailyCoffee', '1,50', 'spending')}
                                ${createInput('Suscripciones mensuales (€)', 'monthlySubs', '30', 'spending')}
                                ${createInput('Comida a domicilio semanal (€)', 'weeklyTakeout', '20', 'spending')}
                            </div>
                            <div class="${ns}-step">
                                <h3>💳 3. Deuda Innecesaria</h3>
                                ${createInput('Total en tarjetas / préstamos (€)', 'debtAmount', '3.000', 'debt')}
                                ${createInput('Interés anual de la deuda (%)', 'debtInterest', '18', 'interest')}
                            </div>
                            <div class="${ns}-step">
                                <h3>🚀 4. Proyección Futura</h3>
                                ${createInput('Años para proyectar la inversión', 'investmentYears', '10', 'years')}
                            </div>
                            <div class="${ns}-step">
                                <div class="${ns}-results-section">
                                    <h3>Diagnóstico Financiero</h3>
                                    <p>Cada año, podrías estar perdiendo:</p>
                                    <p class="${ns}-total-leak" data-id="total-leak-output">0 €</p>
                                    <div class="${ns}-breakdown">
                                        <p>Oportunidades: <span data-id="opportunity-leak-output">0 €</span></p>
                                        <p>Gastos: <span data-id="spending-leak-output">0 €</span></p>
                                        <p>Deuda: <span data-id="debt-leak-output">0 €</span></p>
                                    </div>
                                    <div>
                                        <h3>¡El Panorama Puede Cambiar!</h3>
                                        <p>Si invirtieras esa fuga, en <span data-id="years-output">10</span> años podrías tener:</p>
                                        <p class="${ns}-projection-value" data-id="projection-output">0 €</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="${ns}-nav-buttons">
                        <button class="${ns}-button ${ns}-prev-btn">Anterior</button>
                        <button class="${ns}-button ${ns}-next-btn">Siguiente</button>
                        <button class="${ns}-button ${ns}-restart-btn" style="display:none;">Volver a empezar</button>
                    </div>
                </div>
            `;
        }
    }

    // ========================================================================
    // PUNTO DE ENTRADA DEL SCRIPT
    // ========================================================================

    // Espera a que el DOM esté completamente cargado para inicializar el widget.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new FinancialLeakCalculator('financial-leak-widget'));
    } else {
        new FinancialLeakCalculator('financial-leak-widget');
    }

})(window, document);
