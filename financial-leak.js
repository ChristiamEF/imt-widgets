/**
 * =================================================================================
 * WIDGET CALCULADORA DE FUGAS FINANCIERAS v2.0
 * Creado para ser seguro, robusto, embedible y sin dependencias.
 * ---------------------------------------------------------------------------------
 * Este script crea una calculadora interactiva de "fugas financieras" dentro
 * de un div específico en una página web. Su diseño se centra en la máxima
 * seguridad y aislamiento para evitar conflictos con el sitio anfitrión.
 *
 * Principales Características de Seguridad:
 * - Namespace único para evitar colisiones de CSS e IDs.
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
    // Esto es crucial para que los estilos y IDs no colisionen con la página anfitriona,
    // permitiendo incluso que múltiples copias del widget coexistan sin problemas.
    const WIDGET_NAMESPACE = 'imt_ffc_' + Date.now();

     /**
     * Objeto de configuración centralizado para la seguridad.
     * Define todos los límites y valores seguros para las entradas del usuario.
     */
    const SECURITY_CONFIG = {
        // Dejar el array vacío [] para permitir la ejecución en cualquier dominio.
        ALLOWED_DOMAINS: ['itsmoneytime.co'],
        
        savings:  { min: 0, max: 100000000 }, // 100 Millones
        spending: { min: 0, max: 100000 },    // 100 Mil
        debt:     { min: 0, max: 10000000 },  // 10 Millones
        interest: { min: 0, max: 100 },
        years:    { min: 1, max: 100 }
    };
    
    // El widget completo se encapsula en una clase para una mejor organización.
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
            this.dom = {};
            this.init();
        }

        /**
         * Método de inicialización principal.
         * Orquesta la creación del widget en el orden correcto.
         */
        init() {
            try {
                // PASO 1: Validar el origen antes de ejecutar cualquier otra lógica.
                if (!this.isOriginValid()) {
                    console.warn(`IMT Widget: Ejecución no autorizada en el dominio ${window.location.hostname}.`);
                    this.container.innerHTML = `<p style="color:red; font-family:monospace;">Widget no autorizado.</p>`;
                    return; // Detener la ejecución inmediatamente.
                }

                this.injectHTMLAndCSS();
                this.queryDOMElements();
                this.setupEventListeners();
                this.navigateToStep(0);
                this.dom.inputs.forEach(input => input.dispatchEvent(new Event('blur')));
            } catch (error) {
                console.error('IMT Widget Error de Inicialización:', error);
                this.container.innerHTML = `<p style="color:red;">Error al cargar el widget.</p>`;
            }
        }

        /**
         * Valida que el widget se esté ejecutando en un dominio autorizado.
         * Es una medida de seguridad para prevenir el uso no autorizado del script.
         * @returns {boolean} - True si el dominio es válido, false en caso contrario.
         */
        isOriginValid() {
            const allowedDomains = SECURITY_CONFIG.ALLOWED_DOMAINS;
            // Si la lista de dominios está vacía, se considera una configuración abierta
            // y se permite la ejecución en cualquier sitio.
            if (!allowedDomains || allowedDomains.length === 0) {
                return true;
            }

            const currentDomain = window.location.hostname;

            // Siempre permitir entornos de desarrollo locales para facilitar las pruebas.
            if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
                return true;
            }

            // El método .some() comprueba si al menos un elemento del array cumple la condición.
            // La condición permite el dominio exacto (ej. "site.com") o cualquier subdominio
            // de ese dominio (ej. "blog.site.com").
            return allowedDomains.some(domain =>
                currentDomain === domain || currentDomain.endsWith('.' + domain)
            );
        }

        /**
         * Inyecta el HTML y CSS necesarios en el contenedor del widget.
         * Los estilos se inyectan en el <head> para asegurar su aplicación.
         */
        injectHTMLAndCSS() {
            const styles = `/* CSS minificado con prefijo dinámico */ .${this.namespace}-widget-container{font-family:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background-color:#fff;color:#1a1a1a;padding:24px;border:2px solid #1a1a1a;border-radius:24px;box-shadow:0 8px 0 #1a1a1a;max-width:500px;margin:0 auto;transition:all .3s ease;position:relative;overflow:hidden}.${this.namespace}-widget-container *{box-sizing:border-box}.${this.namespace}-widget-container h2{margin:0 0 20px;font-size:24px;text-align:center}.${this.namespace}-wizard-wrapper{overflow:hidden;position:relative}.${this.namespace}-steps-container{display:flex;transition:transform .4s ease-in-out}.${this.namespace}-step{width:100%;flex-shrink:0;padding:5px}.${this.namespace}-input-group{margin-bottom:18px}.${this.namespace}-input-group label{display:block;margin-bottom:8px;font-weight:600;font-size:14px}.${this.namespace}-input-group input{width:100%;padding:12px;border:2px solid #1a1a1a;border-radius:12px;font-size:16px;background-color:#fff;color:#1a1a1a;text-align:right}.${this.namespace}-nav-buttons{display:flex;justify-content:space-between;margin-top:24px}.${this.namespace}-button{padding:12px 20px;border:2px solid #1a1a1a;border-radius:12px;background-color:#fff;color:#1a1a1a;font-size:16px;font-weight:700;cursor:pointer;transition:all .2s ease;box-shadow:0 4px 0 #1a1a1a}.${this.namespace}-button:hover{transform:translateY(-2px);box-shadow:0 6px 0 #1a1a1a}.${this.namespace}-results-section{text-align:center}.${this.namespace}-total-leak{font-size:36px;font-weight:800;color:#d32f2f;margin:10px 0}.${this.namespace}-breakdown{margin:20px 0;padding:15px;background-color:#f5f5f5;border-radius:12px;text-align:left}.${this.namespace-breakdown p{margin:8px 0;display:flex;justify-content:space-between;}.${this.namespace}-projection-value{font-size:36px;font-weight:800;color:#00a86b;margin:10px 0;}`;
            const styleSheet = document.createElement("style");
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
            
            const html = this.createSecureHTML();
            this.container.innerHTML = html;
        }

        /**
         * Almacena referencias a los elementos del DOM más utilizados para
         * evitar búsquedas repetitivas en el DOM, mejorando el rendimiento.
         */
        queryDOMElements() {
            this.dom = {
                stepsContainer: this.container.querySelector(`.${this.namespace}-steps-container`),
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

        /**
         * Crea el HTML del widget de forma segura, utilizando el namespace único
         * para todas las clases y atributos de datos para la identificación.
         */
        createSecureHTML() {
            const ns = this.namespace; // alias para brevedad
            const createInput = (label, dataId, defaultValue, type = 'spending') => `
                <div class="${ns}-input-group">
                    <label for="${ns}-${dataId}">${label}</label>
                    <input type="tel" inputmode="decimal" id="${ns}-${dataId}" value="${defaultValue}" data-id="${dataId}" data-type="${type}" autocomplete="off" maxlength="15">
                </div>`;

            return `
                <div class="${ns}-widget-container">
                    <h2>Calculadora de Fugas Financieras</h2>
                    <div class="${ns}-wizard-wrapper">
                        <div class="${ns}-steps-container">
                            <div class="${ns}-step"><h3>💸 1. Oportunidades Perdidas</h3>${createInput('Ahorros sin invertir (€)', 'savings', '5.000', 'savings')}</div>
                            <div class="${ns}-step"><h3>☕ 2. Gastos Recurrentes</h3>${createInput('Cafés y antojos diarios (€)', 'dailyCoffee', '1,50')}${createInput('Suscripciones mensuales (€)', 'monthlySubs', '30')}${createInput('Comida a domicilio semanal (€)', 'weeklyTakeout', '20')}</div>
                            <div class="${ns}-step"><h3>💳 3. Deuda Innecesaria</h3>${createInput('Total en tarjetas / préstamos (€)', 'debtAmount', '3.000', 'debt')}${createInput('Interés anual de la deuda (%)', 'debtInterest', '18', 'interest')}</div>
                            <div class="${ns}-step"><h3>🚀 4. Proyección Futura</h3>${createInput('Años para proyectar la inversión', 'investmentYears', '10', 'years')}</div>
                            <div class="${ns}-step"><div class="${ns}-results-section"><h3>Diagnóstico Financiero</h3><p>Cada año, podrías estar perdiendo:</p><p class="${ns}-total-leak" data-id="total-leak-output">0 €</p><div class="${ns}-breakdown"><p>Oportunidades: <span data-id="opportunity-leak-output">0 €</span></p><p>Gastos: <span data-id="spending-leak-output">0 €</span></p><p>Deuda: <span data-id="debt-leak-output">0 €</span></p></div><div><h3>¡El Panorama Puede Cambiar!</h3><p>Si invirtieras esa fuga, en <span data-id="years-output">10</span> años podrías tener:</p><p class="${ns}-projection-value" data-id="projection-output">0 €</p></div></div></div>
                        </div>
                    </div>
                    <div class="${ns}-nav-buttons">
                        <button class="${ns}-button ${ns}-prev-btn">Anterior</button>
                        <button class="${ns}-button ${ns}-next-btn">Siguiente</button>
                        <button class="${ns}-button ${ns}-restart-btn" style="display:none;">Volver a empezar</button>
                    </div>
                </div>`;
        }
        
        // --- Lógica de Manejo de Entradas y Seguridad ---

        /**
         * Configura manejadores de eventos seguros para cada campo de entrada.
         * Realiza validación y sanitización en tiempo real.
         */
        setupSecureInputHandlers(input) {
            const fieldType = input.dataset.type;
            const limits = SECURITY_CONFIG[fieldType];
            if (!limits) return;

            const formatter = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            
            // Sanitiza mientras el usuario escribe.
            input.addEventListener('input', e => {
                let sanitized = e.target.value.replace(/[^0-9,]/g, '');
                const parts = sanitized.split(',');
                if (parts.length > 2) sanitized = parts[0] + ',' + parts.slice(1).join('');
                e.target.value = sanitized;
            });
            
            // Formatea el número cuando el usuario sale del campo.
            input.addEventListener('blur', e => {
                const value = this.sanitizeNumber(e.target.value, limits.min, limits.max);
                e.target.value = formatter.format(value);
            });
            
            // Previene el pegado de contenido malicioso.
            input.addEventListener('paste', e => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text');
                const sanitized = text.replace(/[^0-9,]/g, '').substr(0, 15);
                e.target.value = sanitized;
            });
        }
        
        /**
         * Función central de sanitización. Convierte un string a un número,
         * lo parsea correctamente para el formato español y lo restringe
         * a los límites de seguridad.
         */
        sanitizeNumber(value, min, max, defaultValue = 0) {
            const parsed = parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
            if (isNaN(parsed) || !isFinite(parsed)) return defaultValue;
            return Math.min(Math.max(parsed, min), max);
        }

        /**
         * Sanitiza cualquier string para ser insertado de forma segura en el HTML.
         * Aunque usamos textContent (que ya es seguro), es una capa extra de defensa.
         */
        sanitizeHTML(str) {
            const temp = document.createElement('div');
            temp.textContent = String(str);
            return temp.innerHTML;
        }

        // --- Lógica de Cálculo y Navegación ---
        
        /**
         * Realiza todos los cálculos de forma segura y actualiza el DOM
         * con los resultados.
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
        
        navigateToStep(stepIndex) {
            this.dom.stepsContainer.style.transform = `translateX(-${stepIndex * 100}%)`;
            this.currentStep = stepIndex;
            this.updateButtons();
        }

        updateButtons() {
            this.dom.prevBtn.style.visibility = this.currentStep > 0 ? 'visible' : 'hidden';
            this.dom.nextBtn.textContent = this.currentStep === this.totalInputSteps - 1 ? 'Calcular' : 'Siguiente';
            const isResultStep = this.currentStep === this.totalInputSteps;
            this.dom.nextBtn.style.display = isResultStep ? 'none' : 'block';
            this.dom.prevBtn.style.display = isResultStep ? 'none' : 'block';
            this.dom.restartBtn.style.display = isResultStep ? 'block' : 'none';
        }

        handleNext() {
            if (this.currentStep < this.totalInputSteps - 1) {
                this.navigateToStep(this.currentStep + 1);
            } else if (this.currentStep === this.totalInputSteps - 1) {
                this.calculateAndShowResults();
                this.navigateToStep(this.totalInputSteps);
            }
        }
        handlePrev() { if (this.currentStep > 0) this.navigateToStep(this.currentStep - 1); }
        handleRestart() { this.navigateToStep(0); }
    }

    // Punto de entrada del script.
    // Espera a que el DOM esté completamente cargado para inicializar el widget.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new FinancialLeakCalculator('financial-leak-widget'));
    } else {
        new FinancialLeakCalculator('financial-leak-widget');
    }

})(window, document);
