(function() {
    'use strict';
    
    // Límites de seguridad
    const SECURITY_LIMITS = {
        MAX_ITERATIONS: 500,
        MAX_EVENT_LISTENERS: 50,
        MAX_DOM_MUTATIONS: 100,
        INTERACTION_COOLDOWN: 100,
        MAX_INPUT_LENGTH: 100,
        STORAGE_EXPIRY: 24 * 60 * 60 * 1000 // 24 horas
    };

    // Namespace único para storage
    const STORAGE_PREFIX = 'dt_widget_' + Math.random().toString(36).substr(2, 9) + '_';
    
    // Contadores de seguridad
    let iterationCount = 0;
    let lastInteraction = 0;
    let domMutations = 0;
    let eventListenerCount = 0;

    // Datos de convenios (embebidos de forma segura)
    const CONVENIOS_DATA = Object.freeze({
        colombia: Object.freeze({
            nombre: "Colombia",
            vigente: true,
            año_firma: 2015,
            año_vigencia: 2019,
            reglas: Object.freeze({
                residencia_fiscal: "Más de 183 días en el año fiscal o centro de intereses vitales",
                trabajo_dependiente: "País donde se presta el servicio (con excepciones)",
                trabajo_independiente: "País de residencia del contribuyente",
                pensiones: "País de residencia del beneficiario",
                dividendos: "Retención máxima 15% en país de origen",
                intereses: "Retención máxima 10% en país de origen",
                regalias: "País de residencia del beneficiario",
                inmuebles: "País donde se ubica el inmueble"
            }),
            metodo_eliminacion: "Crédito fiscal (imputación)"
        }),
        mexico: Object.freeze({
            nombre: "México",
            vigente: true,
            año_firma: 1991,
            año_vigencia: 1993,
            reglas: Object.freeze({
                residencia_fiscal: "Más de 183 días en el año fiscal o centro de intereses vitales",
                trabajo_dependiente: "País donde se presta el servicio",
                trabajo_independiente: "País de residencia del contribuyente",
                pensiones: "País de residencia del beneficiario",
                dividendos: "Retención máxima 15% en país de origen",
                intereses: "Retención máxima 10% en país de origen",
                regalias: "País de residencia del beneficiario",
                inmuebles: "País donde se ubica el inmueble"
            }),
            metodo_eliminacion: "Crédito fiscal"
        }),
        argentina: Object.freeze({
            nombre: "Argentina",
            vigente: true,
            año_firma: 1979,
            año_vigencia: 1983,
            reglas: Object.freeze({
                residencia_fiscal: "Más de 183 días en el año fiscal",
                trabajo_dependiente: "País donde se presta el servicio",
                trabajo_independiente: "País de residencia del contribuyente",
                pensiones: "País de residencia del beneficiario",
                dividendos: "Retención máxima 15% en país de origen",
                intereses: "Retención máxima 15% en país de origen",
                regalias: "País de residencia del beneficiario",
                inmuebles: "País donde se ubica el inmueble"
            }),
            metodo_eliminacion: "Crédito fiscal"
        }),
        brasil: Object.freeze({
            nombre: "Brasil",
            vigente: true,
            año_firma: 1971,
            año_vigencia: 1972,
            reglas: Object.freeze({
                residencia_fiscal: "Más de 183 días en el año fiscal",
                trabajo_dependiente: "País donde se presta el servicio",
                trabajo_independiente: "País de residencia del contribuyente",
                pensiones: "País de residencia del beneficiario",
                dividendos: "Retención máxima 15% en país de origen",
                intereses: "Retención máxima 15% en país de origen",
                regalias: "País de residencia del beneficiario",
                inmuebles: "País donde se ubica el inmueble"
            }),
            metodo_eliminacion: "Crédito fiscal"
        }),
        chile: Object.freeze({
            nombre: "Chile",
            vigente: true,
            año_firma: 2004,
            año_vigencia: 2007,
            reglas: Object.freeze({
                residencia_fiscal: "Más de 183 días en el año fiscal",
                trabajo_dependiente: "País donde se presta el servicio",
                trabajo_independiente: "País de residencia del contribuyente",
                pensiones: "País de residencia del beneficiario",
                dividendos: "Retención máxima 15% en país de origen",
                intereses: "Retención máxima 15% en país de origen",
                regalias: "País de residencia del beneficiario",
                inmuebles: "País donde se ubica el inmueble"
            }),
            metodo_eliminacion: "Crédito fiscal"
        })
    });

    // Funciones de seguridad
    function sanitizeInput(input, type = 'text') {
        try {
            if (input === null || input === undefined) {
                return type === 'number' ? 0 : '';
            }
            
            if (typeof input !== 'string') {
                input = String(input);
            }
            
            // Limitar longitud
            input = input.substring(0, SECURITY_LIMITS.MAX_INPUT_LENGTH);
            
            switch (type) {
                case 'number':
                    const num = parseInt(input.replace(/[^\d]/g, ''), 10);
                    return isNaN(num) ? 0 : Math.max(0, Math.min(365, num));
                
                case 'select':
                    const allowedValues = ['colombia', 'mexico', 'argentina', 'brasil', 'chile', 'francia', 'origen', 'ambos'];
                    return allowedValues.includes(input) ? input : '';
                
                case 'text':
                default:
                    return input.replace(/<[^>]*>/g, '') // Remover HTML
                               .replace(/['";&<>]/g, '') // Remover caracteres peligrosos
                               .replace(/javascript:/gi, '') // Remover javascript:
                               .replace(/data:/gi, '') // Remover data:
                               .trim();
            }
        } catch (error) {
            console.error('Error en sanitización:', error);
            return type === 'number' ? 0 : '';
        }
    }

    function createSecureElement(tag, attributes = {}, textContent = '') {
        try {
            const element = document.createElement(tag);
            
            // Solo permitir atributos seguros
            const allowedAttributes = ['class', 'id', 'data-tipo', 'type', 'min', 'max', 'placeholder', 'value'];
            
            Object.keys(attributes).forEach(attr => {
                if (allowedAttributes.includes(attr)) {
                    element.setAttribute(attr, sanitizeInput(String(attributes[attr]), 'text'));
                }
            });
            
            if (textContent) {
                element.textContent = sanitizeInput(String(textContent), 'text');
            }
            
            return element;
        } catch (error) {
            console.error('Error creando elemento:', error);
            return document.createElement('div');
        }
    }

    function isInteractionAllowed() {
        const now = Date.now();
        if (now - lastInteraction < SECURITY_LIMITS.INTERACTION_COOLDOWN) {
            console.warn('Interacción bloqueada por rate limiting');
            return false;
        }
        lastInteraction = now;
        return true;
    }

    function secureLoop(callback, maxIterations = SECURITY_LIMITS.MAX_ITERATIONS) {
        return function() {
            iterationCount = 0;
            
            while (iterationCount < maxIterations) {
                iterationCount++;
                try {
                    const result = callback();
                    if (result === false) break;
                } catch (error) {
                    console.error('Error en bucle seguro:', error);
                    break;
                }
            }
            
            if (iterationCount >= maxIterations) {
                console.error('Bucle interrumpido por límite de seguridad');
                showSecurityError('Operación interrumpida por seguridad');
            }
        };
    }

    function secureStorage() {
        return {
            set: function(key, value) {
                try {
                    if (typeof key !== 'string' || key.length > 50) return false;
                    
                    const secureKey = STORAGE_PREFIX + key.replace(/[^a-zA-Z0-9_]/g, '');
                    const data = {
                        value: value,
                        timestamp: Date.now(),
                        checksum: btoa(JSON.stringify(value)).slice(0, 10)
                    };
                    
                    localStorage.setItem(secureKey, JSON.stringify(data));
                    return true;
                } catch (error) {
                    console.error('Error en localStorage:', error);
                    return false;
                }
            },
            
            get: function(key) {
                try {
                    const secureKey = STORAGE_PREFIX + key.replace(/[^a-zA-Z0-9_]/g, '');
                    const stored = localStorage.getItem(secureKey);
                    
                    if (!stored) return null;
                    
                    const data = JSON.parse(stored);
                    
                    // Verificar expiración
                    if (Date.now() - data.timestamp > SECURITY_LIMITS.STORAGE_EXPIRY) {
                        this.remove(key);
                        return null;
                    }
                    
                    return data.value;
                } catch (error) {
                    console.error('Error leyendo localStorage:', error);
                    return null;
                }
            },
            
            remove: function(key) {
                try {
                    const secureKey = STORAGE_PREFIX + key.replace(/[^a-zA-Z0-9_]/g, '');
                    localStorage.removeItem(secureKey);
                } catch (error) {
                    console.error('Error removiendo de localStorage:', error);
                }
            }
        };
    }

    function showSecurityError(message) {
        try {
            console.warn('Security Alert:', message);
            
            const alertDiv = createSecureElement('div', {
                'class': 'dt-alert dt-alert-warning'
            });
            
            const icon = createSecureElement('strong', {}, '⚠️ ');
            const text = createSecureElement('span', {}, message);
            
            alertDiv.appendChild(icon);
            alertDiv.appendChild(text);
            
            const container = document.querySelector('.dt-content');
            if (container && container.firstChild) {
                container.insertBefore(alertDiv, container.firstChild);
                
                // Auto-remover después de 5 segundos
                setTimeout(() => {
                    try {
                        if (alertDiv.parentNode) {
                            alertDiv.parentNode.removeChild(alertDiv);
                        }
                    } catch (e) {
                        console.error('Error removiendo alerta:', e);
                    }
                }, 5000);
            }
        } catch (error) {
            console.error('Error mostrando alerta de seguridad:', error);
        }
    }

    function addSecureEventListener(element, event, handler) {
        try {
            if (eventListenerCount >= SECURITY_LIMITS.MAX_EVENT_LISTENERS) {
                console.error('Límite de event listeners alcanzado');
                return false;
            }
            
            const secureHandler = function(e) {
                try {
                    if (!isInteractionAllowed()) return;
                    handler(e);
                } catch (error) {
                    console.error('Error en event handler:', error);
                    showSecurityError('Error procesando interacción');
                }
            };
            
            element.addEventListener(event, secureHandler);
            eventListenerCount++;
            return true;
        } catch (error) {
            console.error('Error añadiendo event listener:', error);
            return false;
        }
    }

    // CSS integrado
    const CSS = `
        .dt-widget {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 20px auto;
            background: white;
            border: 2px solid #2d2d2d;
            border-radius: 24px;
            box-shadow: 8px 8px 0px #2d2d2d;
            overflow: hidden;
            position: relative;
        }

        .dt-header {
            background: #2d2d2d;
           color: white;
           padding: 24px;
           text-align: center;
       }

       .dt-header h2 {
           margin: 0;
           font-size: 24px;
           font-weight: 700;
       }

       .dt-progress {
           background: #efefef;
           padding: 16px 24px;
           border-bottom: 1px solid #ddd;
       }

       .dt-progress-bar {
           background: #efefef;
           height: 8px;
           border-radius: 4px;
           overflow: hidden;
           margin-bottom: 8px;
       }

       .dt-progress-fill {
           background: #124ab4;
           height: 100%;
           transition: width 0.3s ease;
       }

       .dt-progress-text {
           font-size: 14px;
           color: #666;
           text-align: center;
       }

       .dt-content {
           padding: 32px;
       }

       .dt-step {
           display: none;
       }

       .dt-step.active {
           display: block;
       }

       .dt-form-group {
           margin-bottom: 24px;
       }

       .dt-label {
           display: block;
           margin-bottom: 8px;
           font-weight: 600;
           color: #2d2d2d;
       }

       .dt-select, .dt-input {
           width: 100%;
           padding: 12px 16px;
           border: 2px solid #ddd;
           border-radius: 8px;
           font-size: 16px;
           background: white;
           transition: border-color 0.2s;
           box-sizing: border-box;
       }

       .dt-select:focus, .dt-input:focus {
           outline: none;
           border-color: #124ab4;
       }

       .dt-checkbox-group {
           display: grid;
           grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
           gap: 12px;
           margin-top: 12px;
       }

       .dt-checkbox-item {
           display: flex;
           align-items: center;
           padding: 12px;
           border: 2px solid #ddd;
           border-radius: 8px;
           cursor: pointer;
           transition: all 0.2s;
       }

       .dt-checkbox-item:hover {
           border-color: #124ab4;
           background: #f8f9ff;
       }

       .dt-checkbox-item.selected {
           border-color: #124ab4;
           background: #124ab4;
           color: white;
       }

       .dt-checkbox {
           margin-right: 12px;
       }

       .dt-tooltip {
           color: #666;
           font-size: 14px;
           margin-top: 8px;
           padding: 12px;
           background: #f9f9f9;
           border-radius: 6px;
           border-left: 4px solid #124ab4;
       }

       .dt-buttons {
           display: flex;
           justify-content: space-between;
           margin-top: 32px;
           padding-top: 24px;
           border-top: 1px solid #ddd;
       }

       .dt-btn {
           padding: 12px 24px;
           border: 2px solid #2d2d2d;
           border-radius: 8px;
           background: white;
           color: #2d2d2d;
           font-weight: 600;
           cursor: pointer;
           transition: all 0.2s;
       }

       .dt-btn:hover:not(:disabled) {
           background: #2d2d2d;
           color: white;
       }

       .dt-btn:disabled {
           opacity: 0.5;
           cursor: not-allowed;
       }

       .dt-btn-primary {
           background: #124ab4;
           color: white;
           border-color: #124ab4;
       }

       .dt-btn-primary:hover:not(:disabled) {
           background: #0f3a94;
       }

       .dt-alert {
           padding: 16px;
           border-radius: 8px;
           margin-bottom: 16px;
       }

       .dt-alert-info {
           background: #e3f2fd;
           border-left: 4px solid #124ab4;
       }

       .dt-alert-warning {
           background: #fff3e0;
           border-left: 4px solid #ff9800;
       }

       .dt-result-section {
           margin-bottom: 24px;
       }

       .dt-result-section h4 {
           margin: 0 0 12px 0;
           color: #2d2d2d;
           font-size: 18px;
       }

       .dt-result-list {
           list-style: none;
           padding: 0;
           margin: 0;
       }

       .dt-result-list li {
           padding: 8px 0;
           border-bottom: 1px solid #ddd;
       }

       .dt-result-list li:last-child {
           border-bottom: none;
       }

       @media (max-width: 768px) {
           .dt-widget {
               margin: 10px;
               border-radius: 16px;
           }

           .dt-content {
               padding: 20px;
           }

           .dt-checkbox-group {
               grid-template-columns: 1fr;
           }

           .dt-buttons {
               flex-direction: column;
               gap: 12px;
           }
       }
   `;

   // Función principal del widget
   function createDobleTributacionWidget(containerId) {
       try {
           const container = document.getElementById(containerId);
           if (!container) {
               console.error('Container not found:', containerId);
               return;
           }

           // Inyectar CSS de forma segura
           if (!document.getElementById('dt-widget-styles')) {
               const styleSheet = document.createElement('style');
               styleSheet.id = 'dt-widget-styles';
               styleSheet.textContent = CSS;
               document.head.appendChild(styleSheet);
           }

           // Estado del wizard (inmutable donde sea posible)
           let currentStep = 1;
           const totalSteps = 5;
           let userData = {
               pais_origen: '',
               residencia_francia: null,
               residencia_origen: null,
               dias_francia: 0,
               tipos_ingresos: [],
               convenio_data: null
           };

           const storage = secureStorage();

           // Crear estructura HTML de forma segura
           function createWidgetStructure() {
               const widget = createSecureElement('div', { 'class': 'dt-widget' });
               
               // Header
               const header = createSecureElement('div', { 'class': 'dt-header' });
               const title = createSecureElement('h2', {}, '🌍 Guía de Doble Tributación Francia-Latinoamérica');
               header.appendChild(title);
               widget.appendChild(header);

               // Progress
               const progress = createSecureElement('div', { 'class': 'dt-progress' });
               const progressBar = createSecureElement('div', { 'class': 'dt-progress-bar' });
               const progressFill = createSecureElement('div', { 'class': 'dt-progress-fill', 'id': 'dt-progress-fill' });
               progressFill.style.width = '20%';
               progressBar.appendChild(progressFill);
               
               const progressText = createSecureElement('div', { 'class': 'dt-progress-text', 'id': 'dt-progress-text' }, 'Paso 1 de 5');
               progress.appendChild(progressBar);
               progress.appendChild(progressText);
               widget.appendChild(progress);

               // Content
               const content = createSecureElement('div', { 'class': 'dt-content' });
               
               // Crear todos los pasos
               createStep1(content);
               createStep2(content);
               createStep3(content);
               createStep4(content);
               createStep5(content);
               
               // Botones
               createButtons(content);
               
               widget.appendChild(content);
               return widget;
           }

           function createStep1(parent) {
               const step = createSecureElement('div', { 'class': 'dt-step active', 'id': 'dt-step-1' });
               
               const title = createSecureElement('h3', {}, 'Paso 1: ¿Cuál es tu país de origen?');
               step.appendChild(title);
               
               const formGroup = createSecureElement('div', { 'class': 'dt-form-group' });
               const label = createSecureElement('label', { 'class': 'dt-label' }, 'Selecciona tu país latinoamericano:');
               formGroup.appendChild(label);
               
               const select = createSecureElement('select', { 'class': 'dt-select', 'id': 'dt-pais-origen' });
               const defaultOption = createSecureElement('option', { 'value': '' }, '-- Selecciona un país --');
               select.appendChild(defaultOption);
               
               const paises = [
                   { value: 'colombia', text: '🇨🇴 Colombia' },
                   { value: 'mexico', text: '🇲🇽 México' },
                   { value: 'argentina', text: '🇦🇷 Argentina' },
                   { value: 'brasil', text: '🇧🇷 Brasil' },
                   { value: 'chile', text: '🇨🇱 Chile' }
               ];
               
               paises.forEach(pais => {
                   const option = createSecureElement('option', { 'value': pais.value }, pais.text);
                   select.appendChild(option);
               });
               
               formGroup.appendChild(select);
               
               const tooltip = createSecureElement('div', { 'class': 'dt-tooltip' }, 
                   'Selecciona el país donde naciste o del cual tienes la nacionalidad principal.');
               formGroup.appendChild(tooltip);
               
               step.appendChild(formGroup);
               parent.appendChild(step);
           }

           function createStep2(parent) {
               const step = createSecureElement('div', { 'class': 'dt-step', 'id': 'dt-step-2' });
               
               const title = createSecureElement('h3', {}, 'Paso 2: Residencia fiscal');
               step.appendChild(title);
               
               // Días en Francia
               const formGroup1 = createSecureElement('div', { 'class': 'dt-form-group' });
               const label1 = createSecureElement('label', { 'class': 'dt-label' }, 
                   '¿Cuántos días has vivido en Francia en el último año fiscal?');
               formGroup1.appendChild(label1);
               
               const input = createSecureElement('input', { 
                   'type': 'number', 
                   'class': 'dt-input', 
                   'id': 'dt-dias-francia',
                   'min': '0',
                   'max': '365',
                   'placeholder': 'Ej: 200'
               });
               formGroup1.appendChild(input);
               
               const tooltip1 = createSecureElement('div', { 'class': 'dt-tooltip' }, 
                   'Cuenta todos los días que has estado físicamente en Francia, incluyendo fines de semana y vacaciones.');
               formGroup1.appendChild(tooltip1);
               step.appendChild(formGroup1);
               
               // Centro de intereses
               const formGroup2 = createSecureElement('div', { 'class': 'dt-form-group' });
               const label2 = createSecureElement('label', { 'class': 'dt-label' }, 
                   '¿Dónde tienes tu centro de intereses vitales?');
               formGroup2.appendChild(label2);
               
               const select2 = createSecureElement('select', { 'class': 'dt-select', 'id': 'dt-centro-intereses' });
               const options2 = [
                   { value: '', text: '-- Selecciona --' },
                   { value: 'francia', text: 'Francia (familia, trabajo, propiedades principales)' },
                   { value: 'origen', text: 'País de origen' },
                   { value: 'ambos', text: 'Dividido entre ambos países' }
               ];
               
               options2.forEach(opt => {
                   const option = createSecureElement('option', { 'value': opt.value }, opt.text);
                   select2.appendChild(option);
               });
               formGroup2.appendChild(select2);
               
               const tooltip2 = createSecureElement('div', { 'class': 'dt-tooltip' }, 
                   'El centro de intereses vitales incluye: familia, trabajo principal, propiedades, cuentas bancarias principales, etc.');
               formGroup2.appendChild(tooltip2);
               step.appendChild(formGroup2);
               
               parent.appendChild(step);
           }

           function createStep3(parent) {
               const step = createSecureElement('div', { 'class': 'dt-step', 'id': 'dt-step-3' });
               
               const title = createSecureElement('h3', {}, 'Paso 3: Tipos de ingresos');
               step.appendChild(title);
               
               const formGroup = createSecureElement('div', { 'class': 'dt-form-group' });
               const label = createSecureElement('label', { 'class': 'dt-label' }, 
                   '¿Qué tipos de ingresos tienes? (Selecciona todos los que apliquen)');
               formGroup.appendChild(label);
               
               const checkboxGroup = createSecureElement('div', { 'class': 'dt-checkbox-group' });
               
               const tiposIngreso = [
                   { id: 'trabajo_dependiente', text: '💼 Trabajo dependiente (salario)' },
                   { id: 'trabajo_independiente', text: '🚀 Trabajo independiente' },
                   { id: 'dividendos', text: '📈 Dividendos' },
                   { id: 'intereses', text: '🏦 Intereses bancarios' },
                   { id: 'inmuebles', text: '🏠 Rentas inmobiliarias' },
                   { id: 'pensiones', text: '👴 Pensiones' }
               ];
               
               tiposIngreso.forEach(tipo => {
                   const item = createSecureElement('div', { 
                       'class': 'dt-checkbox-item', 
                       'data-tipo': tipo.id 
                   });
                   
                   const checkbox = createSecureElement('input', { 
                       'type': 'checkbox', 
                       'class': 'dt-checkbox', 
                       'id': 'ingreso-' + tipo.id 
                   });
                   
                   const labelEl = createSecureElement('label', {}, tipo.text);
                   labelEl.setAttribute('for', 'ingreso-' + tipo.id);
                   
                   item.appendChild(checkbox);
                   item.appendChild(labelEl);
                   checkboxGroup.appendChild(item);
               });
               
               formGroup.appendChild(checkboxGroup);
               step.appendChild(formGroup);
               parent.appendChild(step);
           }

           function createStep4(parent) {
               const step = createSecureElement('div', { 'class': 'dt-step', 'id': 'dt-step-4' });
               
               const title = createSecureElement('h3', {}, 'Paso 4: Analizando tu situación...');
               step.appendChild(title);
               
               const content = createSecureElement('div', { 'style': 'text-align: center; padding: 40px;' });
               const icon = createSecureElement('div', { 'style': 'font-size: 48px; margin-bottom: 16px;' }, '⚖️');
               const text = createSecureElement('p', {}, 'Analizando los convenios de doble tributación y tu situación específica...');
               
               content.appendChild(icon);
               content.appendChild(text);
               step.appendChild(content);
               parent.appendChild(step);
           }

           function createStep5(parent) {
               const step = createSecureElement('div', { 'class': 'dt-step', 'id': 'dt-step-5' });
               
               const title = createSecureElement('h3', {}, 'Paso 5: Tus resultados');
               step.appendChild(title);
               
               const resultsContainer = createSecureElement('div', { 'id': 'dt-resultados-container' });
               step.appendChild(resultsContainer);
               parent.appendChild(step);
           }

           function createButtons(parent) {
               const buttons = createSecureElement('div', { 'class': 'dt-buttons' });
               
               const btnAnterior = createSecureElement('button', { 
                   'class': 'dt-btn', 
                   'id': 'dt-btn-anterior'
               }, '← Anterior');
               btnAnterior.disabled = true;
               
               const btnSiguiente = createSecureElement('button', { 
                   'class': 'dt-btn dt-btn-primary', 
                   'id': 'dt-btn-siguiente'
               }, 'Siguiente →');
               
               buttons.appendChild(btnAnterior);
               buttons.appendChild(btnSiguiente);
               parent.appendChild(buttons);
           }

           function updateProgress() {
               try {
                   const progressFill = container.querySelector('#dt-progress-fill');
                   const progressText = container.querySelector('#dt-progress-text');
                   
                   if (progressFill && progressText) {
                       const percentage = (currentStep / totalSteps) * 100;
                       progressFill.style.width = percentage + '%';
                       progressText.textContent = `Paso ${currentStep} de ${totalSteps}`;
                   }
               } catch (error) {
                   console.error('Error actualizando progreso:', error);
               }
           }

           function showStep(step) {
               try {
                   // Ocultar todos los pasos
                   const steps = container.querySelectorAll('.dt-step');
                   steps.forEach(s => s.classList.remove('active'));
                   
                   // Mostrar el paso actual
                   const currentStepElement = container.querySelector(`#dt-step-${step}`);
                   if (currentStepElement) {
                       currentStepElement.classList.add('active');
                   }
                   
                   // Actualizar botones
                   const btnAnterior = container.querySelector('#dt-btn-anterior');
                   const btnSiguiente = container.querySelector('#dt-btn-siguiente');
                   
                   if (btnAnterior) {
                       btnAnterior.disabled = step === 1;
                   }
                   
                   if (btnSiguiente) {
                       if (step === totalSteps) {
                           btnSiguiente.textContent = 'Finalizar';
                           btnSiguiente.style.display = 'none';
                       } else {
                           btnSiguiente.textContent = 'Siguiente →';
                           btnSiguiente.style.display = 'inline-block';
                       }
                   }
                   
                   updateProgress();
               } catch (error) {
                   console.error('Error mostrando paso:', error);
               }
           }

           function validateStep(step) {
               try {
                   switch (step) {
                       case 1:
                           const paisElement = container.querySelector('#dt-pais-origen');
                           const pais = sanitizeInput(paisElement ? paisElement.value : '', 'select');
                           if (!pais || !CONVENIOS_DATA[pais]) {
                               showSecurityError('Por favor selecciona tu país de origen.');
                               return false;
                           }
                           userData.pais_origen = pais;
                           userData.convenio_data = CONVENIOS_DATA[pais];
                           return true;
                           
                       case 2:
                           const diasElement = container.querySelector('#dt-dias-francia');
                           const centroElement = container.querySelector('#dt-centro-intereses');
                           
                           const dias = sanitizeInput(diasElement ? diasElement.value : '0', 'number');
                           const centro = sanitizeInput(centroElement ? centroElement.value : '', 'select');
                           
                           if (dias < 0 || dias > 365) {
                               showSecurityError('Por favor ingresa un número válido de días (0-365).');
                               return false;
                           }
                           
                           if (!centro) {
                               showSecurityError('Por favor selecciona dónde tienes tu centro de intereses vitales.');
                               return false;
                           }
                           
                           userData.dias_francia = dias;
                           userData.residencia_francia = dias >= 183 || centro === 'francia';
                           userData.residencia_origen = centro === 'origen' || (dias < 183 && centro === 'ambos');
                           return true;
                           
                       case 3:
                           const tiposSeleccionados = [];
                           const selectedItems = container.querySelectorAll('.dt-checkbox-item.selected');
                           
                           selectedItems.forEach(item => {
                               const tipo = sanitizeInput(item.getAttribute('data-tipo'), 'text');
                               if (tipo) {
                                   tiposSeleccionados.push(tipo);
                               }
                           });
                           
                           if (tiposSeleccionados.length === 0) {
                               showSecurityError('Por favor selecciona al menos un tipo de ingreso.');
                               return false;
                           }
                           
                           userData.tipos_ingresos = tiposSeleccionados;
                           return true;
                           
                       case 4:
                           // Análisis automático con delay
                           setTimeout(() => {
                               try {
                                   generateResults();
                                   nextStep();
                               } catch (error) {
                                   console.error('Error en análisis:', error);
                                   showSecurityError('Error durante el análisis');
                               }
                           }, 2000);
                           return true;
                           
                       default:
                           return true;
                   }
               } catch (error) {
                   console.error('Error en validación:', error);
                   showSecurityError('Error validando información');
                   return false;
               }
           }

           function generateResults() {
               try {
                   const resultsContainer = container.querySelector('#dt-resultados-container');
                   if (!resultsContainer) return;
                   
                   // Limpiar contenedor
                   resultsContainer.innerHTML = '';
                   
                   const convenio = userData.convenio_data;
                   
                   // Información del convenio
                   if (convenio && convenio.vigente) {
                       const alertInfo = createSecureElement('div', { 'class': 'dt-alert dt-alert-info' });
                       const strongEl = createSecureElement('strong', {}, '✅ Convenio de Doble Tributación Vigente');
                       const brEl = document.createElement('br');
                       const textEl = createSecureElement('span', {}, 
                           `Francia y ${convenio.nombre} tienen un convenio vigente desde ${convenio.año_vigencia}. Esto te protege contra la doble tributación.`);
                       
                       alertInfo.appendChild(strongEl);
                       alertInfo.appendChild(brEl);
                       alertInfo.appendChild(textEl);
                       resultsContainer.appendChild(alertInfo);
                   }

                   // Residencia fiscal
                   const residenciaSection = createSecureElement('div', { 'class': 'dt-result-section' });
                   const residenciaTitle = createSecureElement('h4', {}, '🏠 Tu Residencia Fiscal');
                   residenciaSection.appendChild(residenciaTitle);
                   
                   if (userData.residencia_francia && userData.residencia_origen) {
                       const alertWarning = createSecureElement('div', { 'class': 'dt-alert dt-alert-warning' });
                       const strongEl2 = createSecureElement('strong', {}, 'Doble residencia fiscal detectada');
                       const brEl2 = document.createElement('br');
                       const textEl2 = createSecureElement('span', {}, 
                           'Eres residente fiscal en ambos países. El convenio determinará dónde tributas.');
                       
                       alertWarning.appendChild(strongEl2);
                       alertWarning.appendChild(brEl2);
                       alertWarning.appendChild(textEl2);
                       residenciaSection.appendChild(alertWarning);
                   } else if (userData.residencia_francia) {
                       const p = createSecureElement('p');
                       const strong = createSecureElement('strong', {}, 'Francia:');
                       const text = createSecureElement('span', {}, ' Eres residente fiscal en Francia.');
                       p.appendChild(strong);
                       p.appendChild(text);
                       residenciaSection.appendChild(p);
                   } else if (userData.residencia_origen) {
                       const p = createSecureElement('p');
                       const strong = createSecureElement('strong', {}, convenio.nombre + ':');
                       const text = createSecureElement('span', {}, ` Eres residente fiscal en ${convenio.nombre}.`);
                       p.appendChild(strong);
                       p.appendChild(text);
                       residenciaSection.appendChild(p);
                   }
                   
                   resultsContainer.appendChild(residenciaSection);

                   // Análisis por tipo de ingreso
                   const ingresosSection = createSecureElement('div', { 'class': 'dt-result-section' });
                   const ingresosTitle = createSecureElement('h4', {}, '💰 Dónde Tributar por Tipo de Ingreso');
                   ingresosSection.appendChild(ingresosTitle);
                   
                   const ingresosList = createSecureElement('ul', { 'class': 'dt-result-list' });
                   
                   userData.tipos_ingresos.forEach(tipo => {
                       const regla = convenio ? convenio.reglas[tipo] || 'Regla no especificada' : 'Sin convenio - consultar normativa local';
                       const li = createSecureElement('li');
                       const strong = createSecureElement('strong', {}, getTipoIngresoLabel(tipo) + ':');
                       const text = createSecureElement('span', {}, ' ' + regla);
                       li.appendChild(strong);
                       li.appendChild(text);
                       ingresosList.appendChild(li);
                   });
                   
                   ingresosSection.appendChild(ingresosList);
                   resultsContainer.appendChild(ingresosSection);

                   // Recomendaciones
                   const recomendacionesSection = createSecureElement('div', { 'class': 'dt-result-section' });
                   const recomendacionesTitle = createSecureElement('h4', {}, '📋 Próximos Pasos Recomendados');
                   recomendacionesSection.appendChild(recomendacionesTitle);
                   
                   const recomendacionesList = createSecureElement('ul', { 'class': 'dt-result-list' });
                   
                   const recomendaciones = [
                       'Consulta con un asesor fiscal especializado en fiscalidad internacional',
                       'Revisa las fechas límite de declaración en ambos países',
                       'Mantén registros detallados de tus ingresos y días de residencia'
                   ];
                   
                   if (convenio && convenio.metodo_eliminacion) {
                       recomendaciones.push(`Aplica el método de ${convenio.metodo_eliminacion} para evitar doble tributación`);
                   }
                   
                   recomendaciones.forEach(rec => {
                       const li = createSecureElement('li', {}, rec);
                       recomendacionesList.appendChild(li);
                   });
                   
                   recomendacionesSection.appendChild(recomendacionesList);
                   resultsContainer.appendChild(recomendacionesSection);

                   // Disclaimer
                   const disclaimer = createSecureElement('div', { 'class': 'dt-alert dt-alert-warning' });
                   const strongDisclaimer = createSecureElement('strong', {}, '⚠️ Importante:');
                   const textDisclaimer = createSecureElement('span', {}, ' Esta es una guía general. Las reglas fiscales pueden cambiar y cada situación es única. Siempre consulta con un profesional fiscal antes de tomar decisiones importantes.');
                   disclaimer.appendChild(strongDisclaimer);
                   disclaimer.appendChild(textDisclaimer);
                   resultsContainer.appendChild(disclaimer);

               } catch (error) {
                   console.error('Error generando resultados:', error);
                   showSecurityError('Error al generar los resultados');
               }
           }

           function getTipoIngresoLabel(tipo) {
               const labels = {
                   trabajo_dependiente: 'Trabajo dependiente',
                   trabajo_independiente: 'Trabajo independiente',
                   dividendos: 'Dividendos',
                   intereses: 'Intereses bancarios',
                   inmuebles: 'Rentas inmobiliarias',
                   pensiones: 'Pensiones'
               };
               return labels[tipo] || tipo;
           }

           function nextStep() {
               if (!isInteractionAllowed()) return;
               
               if (currentStep < totalSteps) {
                   if (validateStep(currentStep)) {
                       currentStep++;
                       showStep(currentStep);
                       
                       // Guardar progreso
                       storage.set('currentStep', currentStep);
                       storage.set('userData', userData);
                   }
               }
           }

           function previousStep() {
               if (!isInteractionAllowed()) return;
               
               if (currentStep > 1) {
                   currentStep--;
                   showStep(currentStep);
                   storage.set('currentStep', currentStep);
               }
           }

           // Crear el widget
           const widgetElement = createWidgetStructure();
           container.innerHTML = '';
           container.appendChild(widgetElement);

           // Event listeners seguros
           addSecureEventListener(container, 'click', function(e) {
               if (e.target.closest('.dt-checkbox-item')) {
                   const item = e.target.closest('.dt-checkbox-item');
                   const checkbox = item.querySelector('input[type="checkbox"]');
                   
                   if (item && checkbox) {
                       item.classList.toggle('selected');
                       checkbox.checked = item.classList.contains('selected');
                   }
               } else if (e.target.id === 'dt-btn-siguiente') {
                   nextStep();
               } else if (e.target.id === 'dt-btn-anterior') {
                   previousStep();
               }
           });

           // Monitoreo DOM con límites
           const observer = new MutationObserver(function(mutations) {
               domMutations += mutations.length;
               
               if (domMutations > SECURITY_LIMITS.MAX_DOM_MUTATIONS) {
                   console.error('Actividad DOM sospechosa detectada');
                   observer.disconnect();
                   showSecurityError('Actividad sospechosa detectada');
               }
           });

           // Iniciar monitoreo DOM
           observer.observe(container, {
               childList: true,
               subtree: true,
               attributes: true
           });

           // Cargar progreso guardado (si existe)
           try {
               const savedStep = storage.get('currentStep');
               const savedUserData = storage.get('userData');
               
               if (savedStep && savedStep > 1 && savedStep <= totalSteps) {
                   currentStep = savedStep;
               }
               
               if (savedUserData && typeof savedUserData === 'object') {
                   userData = { ...userData, ...savedUserData };
                   
                   // Restaurar valores en formularios
                   setTimeout(() => {
                       restoreFormValues();
                   }, 100);
               }
           } catch (error) {
               console.error('Error cargando progreso:', error);
           }

           function restoreFormValues() {
               try {
                   if (userData.pais_origen) {
                       const paisSelect = container.querySelector('#dt-pais-origen');
                       if (paisSelect) {
                           paisSelect.value = userData.pais_origen;
                       }
                   }
                   
                   if (userData.dias_francia) {
                       const diasInput = container.querySelector('#dt-dias-francia');
                       if (diasInput) {
                           diasInput.value = userData.dias_francia;
                       }
                   }
                   
                   if (userData.tipos_ingresos && userData.tipos_ingresos.length > 0) {
                       userData.tipos_ingresos.forEach(tipo => {
                           const item = container.querySelector(`[data-tipo="${tipo}"]`);
                           if (item) {
                               item.classList.add('selected');
                               const checkbox = item.querySelector('input[type="checkbox"]');
                               if (checkbox) {
                                   checkbox.checked = true;
                               }
                           }
                       });
                   }
               } catch (error) {
                   console.error('Error restaurando valores:', error);
               }
           }

           // API pública limitada
           const publicAPI = {
               nextStep: nextStep,
               previousStep: previousStep,
               getCurrentStep: function() { return currentStep; },
               reset: function() {
                   if (!isInteractionAllowed()) return;
                   try {
                       currentStep = 1;
                       userData = {
                           pais_origen: '',
                           residencia_francia: null,
                           residencia_origen: null,
                           dias_francia: 0,
                           tipos_ingresos: [],
                           convenio_data: null
                       };
                       storage.remove('currentStep');
                       storage.remove('userData');
                       showStep(currentStep);
                   } catch (error) {
                       console.error('Error en reset:', error);
                   }
               }
           };

           // Exponer API de forma segura
           if (!window.dtWidgetInstances) {
               window.dtWidgetInstances = {};
           }
           window.dtWidgetInstances[containerId] = publicAPI;

           // Inicializar
           showStep(currentStep);

           // Cleanup en caso de error
           window.addEventListener('beforeunload', function() {
               try {
                   if (observer) {
                       observer.disconnect();
                   }
               } catch (error) {
                   console.error('Error en cleanup:', error);
               }
           });

       } catch (error) {
           console.error('Error crítico en widget:', error);
           if (container) {
               container.innerHTML = `
                   <div style="padding: 20px; text-align: center; border: 2px solid #ff0000; border-radius: 8px; background: #fff;">
                       <h3>⚠️ Error</h3>
                       <p>No se pudo cargar el widget. Por favor, recarga la página.</p>
                   </div>
               `;
           }
       }
   }

   // Verificación de integridad básica
   function verifyEnvironment() {
       try {
           // Verificar que estamos en un entorno de navegador seguro
           if (typeof window === 'undefined' || typeof document === 'undefined') {
               console.error('Entorno no compatible');
               return false;
           }
           
           // Verificar APIs necesarias
           const requiredAPIs = ['addEventListener', 'createElement', 'querySelector'];
           for (const api of requiredAPIs) {
               if (typeof document[api] !== 'function') {
                   console.error('API requerida no disponible:', api);
                   return false;
               }
           }
           
           return true;
       } catch (error) {
           console.error('Error verificando entorno:', error);
           return false;
       }
   }

   // Auto-inicializar solo si el entorno es seguro
   document.addEventListener('DOMContentLoaded', function() {
       try {
           if (!verifyEnvironment()) {
               console.error('Entorno no seguro, no se inicializa el widget');
               return;
           }
           
           const defaultContainer = document.getElementById('doble-tributacion-widget');
           if (defaultContainer) {
               createDobleTributacionWidget('doble-tributacion-widget');
           }
       } catch (error) {
           console.error('Error en auto-inicialización:', error);
       }
   });

   // Exponer función globalmente de forma segura
   if (verifyEnvironment()) {
       window.createDobleTributacionWidget = createDobleTributacionWidget;
       
       // API global para acceder a instancias
       window.getDobleTributacionWidget = function(containerId) {
           return window.dtWidgetInstances && window.dtWidgetInstances[containerId] || null;
       };
   }

   // Compatibilidad con CSP estricto
   if (typeof window !== 'undefined' && window.dtWidgetConfig) {
       const config = window.dtWidgetConfig;
       if (config.autoInit !== false && config.containerId) {
           document.addEventListener('DOMContentLoaded', function() {
               createDobleTributacionWidget(config.containerId);
           });
       }
   }

})();
