(function() {
    'use strict';
    
    // Namespace único para evitar colisiones
    const WIDGET_NAMESPACE = 'imt_ffc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Configuración de seguridad y límites
    const SECURITY_CONFIG = {
        MAX_AMOUNT: 100000000, // 100 millones máximo
        MIN_AMOUNT: 0,
        MAX_INTEREST: 100,
        MIN_INTEREST: 0,
        MAX_YEARS: 50,
        MIN_YEARS: 1,
        MAX_ITERATIONS: 600, // Prevenir loops infinitos
        //ALLOWED_DOMAINS: ['itsmoneytime.eu', 'localhost'] // Dominios permitidos (opcional)
    };
    
    // Sanitización de HTML para prevenir XSS
    const sanitizeHTML = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
    
    // Sanitización de números con validación de rangos
    const sanitizeNumber = (value, min, max, defaultValue = 0) => {
        // Eliminar caracteres no numéricos excepto coma y punto
        const sanitized = String(value).replace(/[^0-9.,\-]/g, '');
        const parsed = parseFloat(sanitized.replace(/\./g, '').replace(',', '.'));
        
        if (isNaN(parsed) || !isFinite(parsed)) {
            return defaultValue;
        }
        
        // Aplicar límites de seguridad
        return Math.min(Math.max(parsed, min), max);
    };
    
    // Validación de origen (opcional - solo si necesitas restricción de dominios)
    const validateOrigin = () => {
        if (SECURITY_CONFIG.ALLOWED_DOMAINS.length > 0) {
            const currentDomain = window.location.hostname;
            const isAllowed = SECURITY_CONFIG.ALLOWED_DOMAINS.some(domain => 
                currentDomain === domain || currentDomain.endsWith('.' + domain)
            );
            
            if (!isAllowed && currentDomain !== 'localhost' && currentDomain !== '127.0.0.1') {
                console.warn('IMT Widget: Domain not authorized');
                return false;
            }
        }
        return true;
    };
    
    // Verificar contenedor de forma segura
    const container = document.getElementById('financial-leak-widget');
    if (!container) {
        console.error('IMT Widget Error: Container element with id "financial-leak-widget" not found.');
        return;
    }
    
    // Validar origen si es necesario
    if (!validateOrigin()) {
        container.innerHTML = '<p style="color: red;">Widget no autorizado en este dominio.</p>';
        return;
    }
    
    // CSS con prefijos únicos y !important para evitar sobrescritura
    const styles = `
        .${WIDGET_NAMESPACE}-widget-container {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            background-color: #ffffff !important;
            color: #1a1a1a !important;
            padding: 24px !important;
            border: 2px solid #1a1a1a !important;
            border-radius: 24px !important;
            box-shadow: 0 8px 0 #1a1a1a !important;
            max-width: 500px !important;
            margin: 0 auto !important;
            transition: all 0.3s ease !important;
            position: relative !important;
            overflow: hidden !important;
        }
        
        .${WIDGET_NAMESPACE}-widget-container * {
            box-sizing: border-box !important;
        }
        
        .${WIDGET_NAMESPACE}-widget-container h2 {
            margin: 0 0 20px 0 !important;
            font-size: 24px !important;
            text-align: center !important;
        }
        
        .${WIDGET_NAMESPACE}-wizard-wrapper {
            overflow: hidden !important;
            position: relative !important;
        }
        
        .${WIDGET_NAMESPACE}-steps-container {
            display: flex !important;
            transition: transform 0.4s ease-in-out !important;
        }
        
        .${WIDGET_NAMESPACE}-step {
            width: 100% !important;
            flex-shrink: 0 !important;
            padding: 5px !important;
        }
        
        .${WIDGET_NAMESPACE}-input-group input {
            width: 100% !important;
            padding: 12px !important;
            border: 2px solid #1a1a1a !important;
            border-radius: 12px !important;
            font-size: 16px !important;
            background-color: #ffffff !important;
            color: #1a1a1a !important;
            text-align: right !important;
        }
        
        /* Resto de estilos con prefijos únicos... */
    `;
    
    // HTML con atributos data- seguros
    const createSecureHTML = () => {
        return `
            <div class="${WIDGET_NAMESPACE}-widget-container" data-widget-id="${WIDGET_NAMESPACE}">
                <h2>Calculadora de Fugas Financieras</h2>
                <div class="${WIDGET_NAMESPACE}-wizard-wrapper">
                    <div class="${WIDGET_NAMESPACE}-steps-container" id="${WIDGET_NAMESPACE}-steps-container">
                        <!-- Steps con IDs únicos -->
                        ${createStepsHTML()}
                    </div>
                </div>
                <div class="${WIDGET_NAMESPACE}-nav-buttons">
                    <button class="${WIDGET_NAMESPACE}-button" id="${WIDGET_NAMESPACE}-prev-btn">Anterior</button>
                    <button class="${WIDGET_NAMESPACE}-button" id="${WIDGET_NAMESPACE}-next-btn">Siguiente</button>
                    <button class="${WIDGET_NAMESPACE}-button" id="${WIDGET_NAMESPACE}-restart-btn" style="display: none;">Volver a empezar</button>
                </div>
            </div>
        `;
    };
    
    const createStepsHTML = () => {
        // Crear HTML de steps con sanitización
        return `
            <div class="${WIDGET_NAMESPACE}-step">
                <h3>💸 1. Oportunidades Perdidas</h3>
                <div class="${WIDGET_NAMESPACE}-input-group">
                    <label for="${WIDGET_NAMESPACE}-savings-amount">Ahorros sin invertir (€)</label>
                    <input type="text" 
                           id="${WIDGET_NAMESPACE}-savings-amount" 
                           value="5.000"
                           data-min="0"
                           data-max="${SECURITY_CONFIG.MAX_AMOUNT}"
                           autocomplete="off"
                           maxlength="15">
                </div>
            </div>
            <!-- Resto de steps... -->
        `;
    };
    
    function initializeWidget() {
        try {
            // Inyectar estilos de forma segura
            const styleSheet = document.createElement("style");
            styleSheet.textContent = styles;
            styleSheet.setAttribute('data-widget-styles', WIDGET_NAMESPACE);
            document.head.appendChild(styleSheet);
            
            // Inyectar HTML
            container.innerHTML = createSecureHTML();
            
            // Obtener elementos con IDs únicos
            const stepsContainer = document.getElementById(`${WIDGET_NAMESPACE}-steps-container`);
            const prevBtn = document.getElementById(`${WIDGET_NAMESPACE}-prev-btn`);
            const nextBtn = document.getElementById(`${WIDGET_NAMESPACE}-next-btn`);
            const restartBtn = document.getElementById(`${WIDGET_NAMESPACE}-restart-btn`);
            
            let currentStep = 0;
            let iterationCount = 0; // Contador para prevenir loops infinitos
            
            // Manejador de entrada seguro con validación
            const setupSecureInputHandlers = (inputElement) => {
                if (!inputElement) return;
                
                const minValue = parseFloat(inputElement.dataset.min) || SECURITY_CONFIG.MIN_AMOUNT;
                const maxValue = parseFloat(inputElement.dataset.max) || SECURITY_CONFIG.MAX_AMOUNT;
                
                // Validación en tiempo real
                inputElement.addEventListener('input', (e) => {
                    // Prevenir inyección de scripts
                    let value = e.target.value;
                    
                    // Eliminar caracteres peligrosos
                    value = value.replace(/[<>\"\'`]/g, '');
                    
                    // Solo permitir números y formato
                    let sanitized = value.replace(/[^0-9,]/g, '');
                    
                    // Limitar longitud para prevenir DoS
                    if (sanitized.length > 15) {
                        sanitized = sanitized.substr(0, 15);
                    }
                    
                    // Asegurar solo una coma decimal
                    const parts = sanitized.split(',');
                    if (parts.length > 2) {
                        sanitized = parts[0] + ',' + parts.slice(1).join('');
                    }
                    
                    e.target.value = sanitized;
                });
                
                // Validación al perder foco
                inputElement.addEventListener('blur', (e) => {
                    const value = sanitizeNumber(e.target.value, minValue, maxValue);
                    const formatter = new Intl.NumberFormat('es-ES', { 
                        minimumFractionDigits: 0, 
                        maximumFractionDigits: 2 
                    });
                    e.target.value = formatter.format(value);
                });
                
                // Prevenir pegado de contenido malicioso
                inputElement.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const text = (e.clipboardData || window.clipboardData).getData('text');
                    const sanitized = text.replace(/[^0-9,]/g, '').substr(0, 15);
                    e.target.value = sanitized;
                });
            };
            
            // Aplicar manejadores seguros a todos los inputs
            document.querySelectorAll(`[id^="${WIDGET_NAMESPACE}-"]input`).forEach(setupSecureInputHandlers);
            
            // Cálculo seguro con límites y manejo de errores
            const calculateAndShowResults = () => {
                try {
                    // Incrementar contador de iteraciones
                    iterationCount++;
                    if (iterationCount > SECURITY_CONFIG.MAX_ITERATIONS) {
                        throw new Error('Maximum iterations exceeded');
                    }
                    
                    // Obtener valores con sanitización
                    const getSecureValue = (id) => {
                        const element = document.getElementById(`${WIDGET_NAMESPACE}-${id}`);
                        if (!element) return 0;
                        
                        const dataMin = parseFloat(element.dataset.min) || 0;
                        const dataMax = parseFloat(element.dataset.max) || SECURITY_CONFIG.MAX_AMOUNT;
                        
                        return sanitizeNumber(element.value, dataMin, dataMax);
                    };
                    
                    const vals = {
                        savings: getSecureValue('savings-amount'),
                        coffee: getSecureValue('daily-coffee'),
                        subs: getSecureValue('monthly-subs'),
                        takeout: getSecureValue('weekly-takeout'),
                        debt: getSecureValue('debt-amount'),
                        interest: sanitizeNumber(getSecureValue('debt-interest'), 0, 100),
                        years: Math.round(sanitizeNumber(getSecureValue('investment-years'), 1, 50))
                    };
                    
                    // Cálculos con validación
                    const opportunityLeak = Math.min(vals.savings * 0.05, SECURITY_CONFIG.MAX_AMOUNT);
                    const spendingLeak = Math.min(
                        (vals.coffee * 220) + (vals.subs * 12) + (vals.takeout * 52),
                        SECURITY_CONFIG.MAX_AMOUNT
                    );
                    const debtLeak = Math.min(vals.debt * (vals.interest / 100), SECURITY_CONFIG.MAX_AMOUNT);
                    const totalLeak = Math.min(opportunityLeak + spendingLeak + debtLeak, SECURITY_CONFIG.MAX_AMOUNT);
                    
                    // Cálculo de proyección con límites seguros
                    const rate = 0.06;
                    let futureValue = 0;
                    
                    if (vals.years > 0 && vals.years <= SECURITY_CONFIG.MAX_YEARS && totalLeak > 0) {
                        // Prevenir overflow en el cálculo exponencial
                        const growthFactor = Math.pow(1 + rate, vals.years);
                        
                        if (isFinite(growthFactor) && growthFactor < Number.MAX_SAFE_INTEGER) {
                            futureValue = totalLeak * ((growthFactor - 1) / rate);
                            futureValue = Math.min(futureValue, Number.MAX_SAFE_INTEGER);
                        }
                    }
                    
                    // Actualizar DOM de forma segura usando textContent
                    const updateElement = (id, value) => {
                        const element = document.getElementById(`${WIDGET_NAMESPACE}-${id}`);
                        if (element) {
                            // textContent es seguro contra XSS
                            element.textContent = sanitizeHTML(String(value));
                        }
                    };
                    
                    const formatter = new Intl.NumberFormat('es-ES', { 
                        minimumFractionDigits: 0, 
                        maximumFractionDigits: 0 
                    });
                    
                    updateElement('total-leak-output', `${formatter.format(totalLeak)} €`);
                    updateElement('opportunity-leak-output', `${formatter.format(opportunityLeak)} €`);
                    updateElement('spending-leak-output', `${formatter.format(spendingLeak)} €`);
                    updateElement('debt-leak-output', `${formatter.format(debtLeak)} €`);
                    updateElement('years-output', vals.years);
                    updateElement('projection-output', `${formatter.format(futureValue)} €`);
                    
                } catch (error) {
                    console.error('IMT Widget Calculation Error:', error);
                    // Mostrar mensaje de error seguro
                    const resultsSection = document.querySelector(`.${WIDGET_NAMESPACE}-results-section`);
                    if (resultsSection) {
                        resultsSection.innerHTML = '<p style="color: red;">Error en el cálculo. Por favor, verifica los valores ingresados.</p>';
                    }
                }
            };
            
            // Event listeners con prevención de múltiples clicks
            let isProcessing = false;
            
            const handleNavigation = (direction) => {
                if (isProcessing) return;
                isProcessing = true;
                
                setTimeout(() => {
                    isProcessing = false;
                }, 300);
                
                if (direction === 'next') {
                    if (currentStep < 3) {
                        navigateToStep(currentStep + 1);
                    } else if (currentStep === 3) {
                        calculateAndShowResults();
                        navigateToStep(4);
                    }
                } else if (direction === 'prev' && currentStep > 0) {
                    navigateToStep(currentStep - 1);
                }
            };
            
            const navigateToStep = (stepIndex) => {
                if (stepIndex < 0 || stepIndex > 4) return;
                
                stepsContainer.style.transform = `translateX(-${stepIndex * 100}%)`;
                currentStep = stepIndex;
                updateButtons();
            };
            
            const updateButtons = () => {
                prevBtn.style.visibility = currentStep > 0 ? 'visible' : 'hidden';
                nextBtn.textContent = currentStep === 3 ? 'Calcular' : 'Siguiente';
                
                if (currentStep === 4) {
                    nextBtn.style.display = 'none';
                    prevBtn.style.display = 'none';
                    restartBtn.style.display = 'block';
                }
            };
            
            // Agregar event listeners de forma segura
            nextBtn.addEventListener('click', () => handleNavigation('next'));
            prevBtn.addEventListener('click', () => handleNavigation('prev'));
            
            restartBtn.addEventListener('click', () => {
                iterationCount = 0; // Reset contador
                navigateToStep(0);
                nextBtn.style.display = 'block';
                prevBtn.style.display = 'block';
                restartBtn.style.display = 'none';
                updateButtons();
            });
            
            // Inicializar
            navigateToStep(0);
            
            // Limpiar recursos al desmontar (si el contenedor es eliminado)
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && !document.contains(container)) {
                        // Limpiar estilos
                        const widgetStyles = document.querySelector(`[data-widget-styles="${WIDGET_NAMESPACE}"]`);
                        if (widgetStyles) {
                            widgetStyles.remove();
                        }
                        observer.disconnect();
                    }
                });
            });
            
            observer.observe(document.body, { childList: true, subtree: true });
            
        } catch (error) {
            console.error('IMT Widget Initialization Error:', error);
            container.innerHTML = '<p style="color: red;">Error al inicializar el widget.</p>';
        }
    }
    
    // Inicialización segura
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeWidget);
    } else {
        // Pequeño delay para evitar conflictos con otros scripts
        setTimeout(initializeWidget, 0);
    }
    
    // Prevenir acceso global al namespace
    Object.freeze(window[WIDGET_NAMESPACE] = null);
    
})();
