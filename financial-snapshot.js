(function() {
    'use strict';
    
    // Namespace único para evitar conflictos
    const WIDGET_PREFIX = 'imt-financial-snapshot';
    const STORAGE_KEY = `${WIDGET_PREFIX}-data`;
    const MAX_ITERATIONS = 600;
    const CALC_TIMEOUT = 5000;
    
    // Utilidades de seguridad
    function sanitizeInput(input) {
        if (typeof input === 'string') {
            return input.replace(/[<>\"'&]/g, '');
        }
        return input;
    }
    
    function validateNumber(value, min = 0, max = 999999999) {
        const num = parseFloat(value);
        if (isNaN(num)) return 0;
        return Math.max(min, Math.min(max, num));
    }
    
    function formatCurrency(amount) {
        try {
            return new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        } catch (e) {
            return `€${amount.toLocaleString('es-ES')}`;
        }
    }
    
    function formatNumber(num) {
        try {
            return new Intl.NumberFormat('es-ES').format(num);
        } catch (e) {
            return num.toString();
        }
    }
    
    // Crear el contenedor del widget
    function createWidget() {
        const container = document.getElementById(`${WIDGET_PREFIX}-container`);
        if (!container) return;
        
        // CSS integrado
        const styles = `
            <style>
                .${WIDGET_PREFIX}-widget {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 800px;
                    margin: 20px auto;
                    background: white;
                    border: 2px solid #000;
                    border-radius: 24px;
                    box-shadow: 8px 8px 0 #000;
                    padding: 32px;
                    color: #000;
                    box-sizing: border-box;
                }
                
                .${WIDGET_PREFIX}-title {
                    font-size: 28px;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 24px;
                    color: #000;
                }
                
                .${WIDGET_PREFIX}-step {
                    display: none;
                    animation: fadeIn 0.3s ease-in;
                }
                
                .${WIDGET_PREFIX}-step.active {
                    display: block;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .${WIDGET_PREFIX}-step-title {
                    font-size: 22px;
                    font-weight: bold;
                    margin-bottom: 20px;
                    color: #000;
                    border-bottom: 2px solid #000;
                    padding-bottom: 8px;
                }
                
                .${WIDGET_PREFIX}-form-group {
                    margin-bottom: 20px;
                }
                
                .${WIDGET_PREFIX}-label {
                    display: block;
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: #000;
                }
                
                .${WIDGET_PREFIX}-input {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #000;
                    border-radius: 8px;
                    font-size: 16px;
                    box-sizing: border-box;
                    background: white;
                }
                
                .${WIDGET_PREFIX}-input:focus {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(0,0,0,0.1);
                }
                
                .${WIDGET_PREFIX}-select {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #000;
                    border-radius: 8px;
                    font-size: 16px;
                    background: white;
                    box-sizing: border-box;
                }
                
                .${WIDGET_PREFIX}-checkbox-group {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-top: 8px;
                }
                
                .${WIDGET_PREFIX}-checkbox-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .${WIDGET_PREFIX}-checkbox {
                    width: 18px;
                    height: 18px;
                }
                
                .${WIDGET_PREFIX}-button {
                    background: #000;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    margin: 8px;
                    transition: all 0.2s;
                }
                
                .${WIDGET_PREFIX}-button:hover {
                    background: #333;
                    transform: translateY(-2px);
                }
                
                .${WIDGET_PREFIX}-button:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .${WIDGET_PREFIX}-button-secondary {
                    background: white;
                    color: #000;
                    border: 2px solid #000;
                }
                
                .${WIDGET_PREFIX}-button-secondary:hover {
                    background: #f0f0f0;
                }
                
                .${WIDGET_PREFIX}-progress {
                    width: 100%;
                    height: 8px;
                    background: #f0f0f0;
                    border-radius: 4px;
                    margin-bottom: 24px;
                    overflow: hidden;
                }
                
                .${WIDGET_PREFIX}-progress-bar {
                    height: 100%;
                    background: #000;
                    transition: width 0.3s ease;
                }
                
                .${WIDGET_PREFIX}-navigation {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 24px;
                }
                
                .${WIDGET_PREFIX}-dashboard {
                    display: none;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                    margin-top: 24px;
                }
                
                .${WIDGET_PREFIX}-dashboard.active {
                    display: grid;
                }
                
                .${WIDGET_PREFIX}-dashboard-panel {
                    background: #f8f8f8;
                    border: 2px solid #000;
                    border-radius: 12px;
                    padding: 20px;
                }
                
                .${WIDGET_PREFIX}-dashboard-title {
                    font-weight: bold;
                    font-size: 18px;
                    margin-bottom: 16px;
                    color: #000;
                }
                
                .${WIDGET_PREFIX}-metric {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid #ddd;
                }
                
                .${WIDGET_PREFIX}-metric:last-child {
                    border-bottom: none;
                }
                
                .${WIDGET_PREFIX}-metric-label {
                    font-weight: 500;
                }
                
                .${WIDGET_PREFIX}-metric-value {
                    font-weight: bold;
                    color: #000;
                }
                
                .${WIDGET_PREFIX}-editable-section {
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 16px;
                }
                
                .${WIDGET_PREFIX}-editable-title {
                    font-weight: bold;
                    margin-bottom: 12px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .${WIDGET_PREFIX}-collapsible-content {
                    display: none;
                }
                
                .${WIDGET_PREFIX}-collapsible-content.expanded {
                    display: block;
                }
                
                .${WIDGET_PREFIX}-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                
                .${WIDGET_PREFIX}-full-width {
                    grid-column: 1 / -1;
                }
                
                .${WIDGET_PREFIX}-alert {
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 16px;
                    font-weight: 500;
                }
                
                .${WIDGET_PREFIX}-alert-warning {
                    background: #fff3cd;
                    border: 2px solid #ffc107;
                    color: #856404;
                }
                
                .${WIDGET_PREFIX}-alert-success {
                    background: #d4edda;
                    border: 2px solid #28a745;
                    color: #155724;
                }
                
                .${WIDGET_PREFIX}-alert-danger {
                    background: #f8d7da;
                    border: 2px solid #dc3545;
                    color: #721c24;
                }
                
                @media (max-width: 768px) {
                    .${WIDGET_PREFIX}-widget {
                        margin: 10px;
                        padding: 20px;
                    }
                    
                    .${WIDGET_PREFIX}-dashboard {
                        grid-template-columns: 1fr;
                    }
                    
                    .${WIDGET_PREFIX}-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .${WIDGET_PREFIX}-navigation {
                        flex-direction: column;
                        gap: 12px;
                    }
                }
            </style>
        `;
        
        container.innerHTML = styles + `
            <div class="${WIDGET_PREFIX}-widget">
                <h1 class="${WIDGET_PREFIX}-title">📊 Mi Punto de Partida Financiero</h1>
                
                <div class="${WIDGET_PREFIX}-progress">
                    <div class="${WIDGET_PREFIX}-progress-bar" id="${WIDGET_PREFIX}-progress-bar"></div>
                </div>
                
                <!-- Paso 1: Ingresos -->
                <div class="${WIDGET_PREFIX}-step active" id="${WIDGET_PREFIX}-step-1">
                    <h2 class="${WIDGET_PREFIX}-step-title">💰 Paso 1: Tus Ingresos</h2>
                    
                    <div class="${WIDGET_PREFIX}-form-group">
                        <label class="${WIDGET_PREFIX}-label">¿Cuáles son tus ingresos mensuales netos?</label>
                        <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-monthly-income" placeholder="2,500">
                    </div>
                    
                    <div class="${WIDGET_PREFIX}-form-group">
                        <label class="${WIDGET_PREFIX}-label">¿De dónde provienen principalmente?</label>
                        <div class="${WIDGET_PREFIX}-checkbox-group">
                            <div class="${WIDGET_PREFIX}-checkbox-item">
                                <input type="checkbox" class="${WIDGET_PREFIX}-checkbox" id="${WIDGET_PREFIX}-source-salary" value="salary">
                                <label for="${WIDGET_PREFIX}-source-salary">Salario</label>
                            </div>
                            <div class="${WIDGET_PREFIX}-checkbox-item">
                                <input type="checkbox" class="${WIDGET_PREFIX}-checkbox" id="${WIDGET_PREFIX}-source-freelance" value="freelance">
                                <label for="${WIDGET_PREFIX}-source-freelance">Freelance</label>
                            </div>
                            <div class="${WIDGET_PREFIX}-checkbox-item">
                                <input type="checkbox" class="${WIDGET_PREFIX}-checkbox" id="${WIDGET_PREFIX}-source-business" value="business">
                                <label for="${WIDGET_PREFIX}-source-business">Negocio</label>
                            </div>
                            <div class="${WIDGET_PREFIX}-checkbox-item">
                                <input type="checkbox" class="${WIDGET_PREFIX}-checkbox" id="${WIDGET_PREFIX}-source-investments" value="investments">
                                <label for="${WIDGET_PREFIX}-source-investments">Inversiones</label>
                            </div>
                            <div class="${WIDGET_PREFIX}-checkbox-item">
                                <input type="checkbox" class="${WIDGET_PREFIX}-checkbox" id="${WIDGET_PREFIX}-source-other" value="other">
                                <label for="${WIDGET_PREFIX}-source-other">Otros</label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="${WIDGET_PREFIX}-form-group">
                        <label class="${WIDGET_PREFIX}-label">¿Son estables tus ingresos?</label>
                        <select class="${WIDGET_PREFIX}-select" id="${WIDGET_PREFIX}-income-stability">
                            <option value="">Selecciona una opción</option>
                            <option value="very-stable">Muy estables (mismo monto cada mes)</option>
                            <option value="stable">Estables (pequeñas variaciones)</option>
                            <option value="variable">Variables (cambios significativos)</option>
                            <option value="very-variable">Muy variables (impredecibles)</option>
                        </select>
                    </div>
                </div>
                
                <!-- Paso 2: Gastos -->
                <div class="${WIDGET_PREFIX}-step" id="${WIDGET_PREFIX}-step-2">
                    <h2 class="${WIDGET_PREFIX}-step-title">💸 Paso 2: Cómo Usas tu Dinero</h2>
                    
                    <div class="${WIDGET_PREFIX}-alert ${WIDGET_PREFIX}-alert-warning">
                        <strong>The Big Five:</strong> Vamos a clasificar tus gastos en las 5 categorías principales.
                    </div>
                    
                    <div class="${WIDGET_PREFIX}-grid">
                        <div class="${WIDGET_PREFIX}-form-group">
                            <label class="${WIDGET_PREFIX}-label">🏠 No Negociables (sin deuda)</label>
                            <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-non-negotiables" placeholder="1,200">
                        </div>
                        
                        <div class="${WIDGET_PREFIX}-form-group">
                            <label class="${WIDGET_PREFIX}-label">💳 Pago de Deudas</label>
                            <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-debt-payments" placeholder="300">
                        </div>
                        
                        <div class="${WIDGET_PREFIX}-form-group">
                            <label class="${WIDGET_PREFIX}-label">💰 Ahorro</label>
                            <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-savings" placeholder="250">
                        </div>
                        
                        <div class="${WIDGET_PREFIX}-form-group">
                            <label class="${WIDGET_PREFIX}-label">📈 Inversión</label>
                            <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-investment" placeholder="200">
                        </div>
                        
                        <div class="${WIDGET_PREFIX}-form-group">
                            <label class="${WIDGET_PREFIX}-label">🎉 Viva la Vida</label>
                            <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-lifestyle" placeholder="400">
                        </div>
                        
                        <div class="${WIDGET_PREFIX}-form-group">
                            <label class="${WIDGET_PREFIX}-label">❤️ Granito de Arena</label>
                            <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-giving" placeholder="50">
                        </div>
                    </div>
                </div>
                
                <!-- Paso 3: Activos -->
                <div class="${WIDGET_PREFIX}-step" id="${WIDGET_PREFIX}-step-3">
                    <h2 class="${WIDGET_PREFIX}-step-title">🏛️ Paso 3: Tus Activos</h2>
                    
                    <div class="${WIDGET_PREFIX}-grid">
                        <div class="${WIDGET_PREFIX}-form-group">
                            <label class="${WIDGET_PREFIX}-label">💧 Activos Líquidos</label>
                            <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-liquid-assets" placeholder="5,000">
                            <small>Inversiones que puedes convertir en efectivo rápidamente</small>
                        </div>
                        
                        <div class="${WIDGET_PREFIX}-form-group">
                            <label class="${WIDGET_PREFIX}-label">🏢 Activos No Líquidos</label>
                            <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-illiquid-assets" placeholder="50,000">
                            <small>Inmuebles, vehículos, etc.</small>
                        </div>
                        
                        <div class="${WIDGET_PREFIX}-form-group">
                            <label class="${WIDGET_PREFIX}-label">💵 Efectivo Disponible</label>
                            <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-cash" placeholder="1,000">
                            <small>Dinero en cuentas corrientes/ahorros</small>
                        </div>
                        
                        <div class="${WIDGET_PREFIX}-form-group">
                            <label class="${WIDGET_PREFIX}-label">🐷 Fondo de Emergencia</label>
                            <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-emergency-fund" placeholder="3,000">
                            <small>Tu marranito de emergencia</small>
                        </div>
                    </div>
                </div>
                
                <!-- Paso 4: Deudas -->
                <div class="${WIDGET_PREFIX}-step" id="${WIDGET_PREFIX}-step-4">
                    <h2 class="${WIDGET_PREFIX}-step-title">💳 Paso 4: Tus Deudas</h2>
                    
                    <div class="${WIDGET_PREFIX}-grid">
                        <div class="${WIDGET_PREFIX}-form-group">
                            <label class="${WIDGET_PREFIX}-label">🛍️ Deuda de Consumo</label>
                            <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-consumer-debt" placeholder="5,000">
                            <small>Tarjetas de crédito, préstamos personales</small>
                        </div>
                        
                        <div class="${WIDGET_PREFIX}-form-group">
                            <label class="${WIDGET_PREFIX}-label">🏠 Deuda Hipotecaria</label>
                            <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-mortgage-debt" placeholder="150,000">
                            <small>Préstamo de la casa</small>
                        </div>
                        
                        <div class="${WIDGET_PREFIX}-form-group ${WIDGET_PREFIX}-full-width">
                            <label class="${WIDGET_PREFIX}-label">📋 Otro Tipo de Deuda</label>
                            <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-other-debt" placeholder="2,000">
                            <small>Préstamos estudiantiles, familiares, etc.</small>
                        </div>
                    </div>
                </div>
                
                <!-- Dashboard -->
                <div class="${WIDGET_PREFIX}-dashboard" id="${WIDGET_PREFIX}-dashboard">
                    <div class="${WIDGET_PREFIX}-dashboard-panel">
                        <h3 class="${WIDGET_PREFIX}-dashboard-title">📊 Tus Métricas Clave</h3>
                        <div class="${WIDGET_PREFIX}-metric">
                            <span class="${WIDGET_PREFIX}-metric-label">Distribución de Ingresos:</span>
                            <span class="${WIDGET_PREFIX}-metric-value" id="${WIDGET_PREFIX}-income-distribution">-</span>
                        </div>
                        <div class="${WIDGET_PREFIX}-metric">
                            <span class="${WIDGET_PREFIX}-metric-label">Solvencia:</span>
                            <span class="${WIDGET_PREFIX}-metric-value" id="${WIDGET_PREFIX}-solvency">-</span>
                        </div>
                        <div class="${WIDGET_PREFIX}-metric">
                            <span class="${WIDGET_PREFIX}-metric-label">% Endeudamiento:</span>
                            <span class="${WIDGET_PREFIX}-metric-value" id="${WIDGET_PREFIX}-debt-ratio">-</span>
                        </div>
                        <div class="${WIDGET_PREFIX}-metric">
                            <span class="${WIDGET_PREFIX}-metric-label">% Ingresos a Deuda:</span>
                            <span class="${WIDGET_PREFIX}-metric-value" id="${WIDGET_PREFIX}-debt-to-income">-</span>
                        </div>
                        <div class="${WIDGET_PREFIX}-metric">
                            <span class="${WIDGET_PREFIX}-metric-label">Meses de Emergencia:</span>
                            <span class="${WIDGET_PREFIX}-metric-value" id="${WIDGET_PREFIX}-emergency-months">-</span>
                        </div>
                    </div>
                    
                    <div class="${WIDGET_PREFIX}-dashboard-panel">
                        <h3 class="${WIDGET_PREFIX}-dashboard-title">✏️ Editar Datos</h3>
                        
                        <div class="${WIDGET_PREFIX}-editable-section">
                            <div class="${WIDGET_PREFIX}-editable-title" onclick="toggleSection('income')">
                                💰 Ingresos <span id="${WIDGET_PREFIX}-income-toggle">+</span>
                            </div>
                            <div class="${WIDGET_PREFIX}-collapsible-content" id="${WIDGET_PREFIX}-income-content">
                                <div class="${WIDGET_PREFIX}-form-group">
                                    <label class="${WIDGET_PREFIX}-label">Ingresos Mensuales</label>
                                    <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-income">
                                </div>
                            </div>
                        </div>
                        
                        <div class="${WIDGET_PREFIX}-editable-section">
                            <div class="${WIDGET_PREFIX}-editable-title" onclick="toggleSection('expenses')">
                                💸 Gastos <span id="${WIDGET_PREFIX}-expenses-toggle">+</span>
                            </div>
                            <div class="${WIDGET_PREFIX}-collapsible-content" id="${WIDGET_PREFIX}-expenses-content">
                                <div class="${WIDGET_PREFIX}-grid">
                                    <div class="${WIDGET_PREFIX}-form-group">
                                        <label class="${WIDGET_PREFIX}-label">No Negociables</label>
                                        <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-non-negotiables">
                                    </div>
                                    <div class="${WIDGET_PREFIX}-form-group">
                                        <label class="${WIDGET_PREFIX}-label">Pago Deudas</label>
                                        <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-debt-payments">
                                    </div>
                                    <div class="${WIDGET_PREFIX}-form-group">
                                        <label class="${WIDGET_PREFIX}-label">Ahorro</label>
                                        <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-savings">
                                    </div>
                                    <div class="${WIDGET_PREFIX}-form-group">
                                        <label class="${WIDGET_PREFIX}-label">Inversión</label>
                                        <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-investment">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="${WIDGET_PREFIX}-editable-section">
                            <div class="${WIDGET_PREFIX}-editable-title" onclick="toggleSection('assets')">
                                🏛️ Activos <span id="${WIDGET_PREFIX}-assets-toggle">+</span>
                            </div>
                            <div class="${WIDGET_PREFIX}-collapsible-content" id="${WIDGET_PREFIX}-assets-content">
                                <div class="${WIDGET_PREFIX}-grid">
                                    <div class="${WIDGET_PREFIX}-form-group">
                                        <label class="${WIDGET_PREFIX}-label">Líquidos</label>
                                        <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-liquid-assets">
                                    </div>
                                    <div class="${WIDGET_PREFIX}-form-group">
                                        <label class="${WIDGET_PREFIX}-label">No Líquidos</label>
                                        <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-illiquid-assets">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="${WIDGET_PREFIX}-navigation">
                    <button class="${WIDGET_PREFIX}-button ${WIDGET_PREFIX}-button-secondary" id="${WIDGET_PREFIX}-prev-btn" onclick="previousStep()" style="display: none;">← Anterior</button>
                    <span id="${WIDGET_PREFIX}-step-indicator">Paso 1 de 4</span>
                    <button class="${WIDGET_PREFIX}-button" id="${WIDGET_PREFIX}-next-btn" onclick="nextStep()">Siguiente →</button>
                </div>
            </div>
        `;
        
        // Inicializar el widget
        initializeWidget();
    }
    
    // Variables globales del widget
    let currentStep = 1;
    const totalSteps = 4;
    let widgetData = {};
    
    function initializeWidget() {
        try {
            // Cargar datos guardados si existen
            loadSavedData();
            
            // Configurar eventos de formato para inputs numéricos
            setupNumberFormatting();
            
            // Actualizar indicador de progreso
            updateProgress();
            
            // Configurar auto-guardado
            setupAutoSave();
            
        } catch (error) {
            console.error('Error inicializando widget:', error);
        }
    }
    
    function setupNumberFormatting() {
        const numberInputs = document.querySelectorAll(`[id*="${WIDGET_PREFIX}"][type="text"]`);
        
        numberInputs.forEach(input => {
            // Al salir del campo, formatear
            input.addEventListener('blur', function() {
                const value = parseFloat(this.value.replace(/[^\d.-]/g, ''));
                if (!isNaN(value)) {
                    this.value = formatNumber(value);
                }
            });
            
            // Al entrar al campo, quitar formato
            input.addEventListener('focus', function() {
                const value = parseFloat(this.value.replace(/[^\d.-]/g, ''));
                if (!isNaN(value)) {
                    this.value = value.toString();
                }
            });
        });
    }
    
    function setupAutoSave() {
        const inputs = document.querySelectorAll(`[id*="${WIDGET_PREFIX}"]`);
        inputs.forEach(input => {
            input.addEventListener('change', saveData);
            input.addEventListener('input', debounce(saveData, 1000));
        });
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Funciones de navegación
    window.nextStep = function() {
        if (validateCurrentStep() && currentStep < totalSteps) {
            currentStep++;
            showStep(currentStep);
        } else if (currentStep === totalSteps) {
            showDashboard();
        }
    };
    
    window.previousStep = function() {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    };
    
    function showStep(step) {
        try {
            // Ocultar todos los pasos
            for (let i = 1; i <= totalSteps; i++) {
                const stepEl = document.getElementById(`${WIDGET_PREFIX}-step-${i}`);
                if (stepEl) stepEl.classList.remove('active');
            }
            
            // Mostrar paso actual
            const currentStepEl = document.getElementById(`${WIDGET_PREFIX}-step-${step}`);
            if (currentStepEl) currentStepEl.classList.add('active');
            
            // Ocultar dashboard
            const dashboard = document.getElementById(`${WIDGET_PREFIX}-dashboard`);
            if (dashboard) dashboard.classList.remove('active');
            
            updateNavigation();
            updateProgress();
            
        } catch (error) {
            console.error('Error mostrando paso:', error);
        }
    }
    
    function showDashboard() {
        try {
            // Ocultar todos los pasos
            for (let i = 1; i <= totalSteps; i++) {
                const stepEl = document.getElementById(`${WIDGET_PREFIX}-step-${i}`);
                if (stepEl) stepEl.classList.remove('active');
            }
            
            // Mostrar dashboard
            const dashboard = document.getElementById(`${WIDGET_PREFIX}-dashboard`);
            if (dashboard) dashboard.classList.add('active');
            
            // Actualizar navegación para dashboard
            const prevBtn = document.getElementById(`${WIDGET_PREFIX}-prev-btn`);
            const nextBtn = document.getElementById(`${WIDGET_PREFIX}-next-btn`);
            const stepIndicator = document.getElementById(`${WIDGET_PREFIX}-step-indicator`);
           
           if (prevBtn) prevBtn.style.display = 'inline-block';
           if (nextBtn) {
               nextBtn.textContent = 'Nuevo Análisis';
               nextBtn.onclick = resetWidget;
           }
           if (stepIndicator) stepIndicator.textContent = 'Dashboard Final';
           
           // Cargar datos en el dashboard
           loadDashboardData();
           calculateMetrics();
           
       } catch (error) {
           console.error('Error mostrando dashboard:', error);
       }
   }
   
   function updateNavigation() {
       const prevBtn = document.getElementById(`${WIDGET_PREFIX}-prev-btn`);
       const nextBtn = document.getElementById(`${WIDGET_PREFIX}-next-btn`);
       const stepIndicator = document.getElementById(`${WIDGET_PREFIX}-step-indicator`);
       
       if (prevBtn) {
           prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
       }
       
       if (nextBtn) {
           nextBtn.textContent = currentStep === totalSteps ? 'Ver Dashboard →' : 'Siguiente →';
           nextBtn.onclick = nextStep;
       }
       
       if (stepIndicator) {
           stepIndicator.textContent = `Paso ${currentStep} de ${totalSteps}`;
       }
   }
   
   function updateProgress() {
       const progressBar = document.getElementById(`${WIDGET_PREFIX}-progress-bar`);
       if (progressBar) {
           const progress = (currentStep / totalSteps) * 100;
           progressBar.style.width = `${progress}%`;
       }
   }
   
   function validateCurrentStep() {
       try {
           switch (currentStep) {
               case 1:
                   const income = document.getElementById(`${WIDGET_PREFIX}-monthly-income`).value;
                   const stability = document.getElementById(`${WIDGET_PREFIX}-income-stability`).value;
                   
                   if (!income || parseFloat(income.replace(/[^\d.-]/g, '')) <= 0) {
                       showAlert('Por favor, ingresa tus ingresos mensuales', 'warning');
                       return false;
                   }
                   
                   if (!stability) {
                       showAlert('Por favor, selecciona la estabilidad de tus ingresos', 'warning');
                       return false;
                   }
                   
                   // Verificar que al menos una fuente esté seleccionada
                   const sources = document.querySelectorAll(`[id*="${WIDGET_PREFIX}-source-"]:checked`);
                   if (sources.length === 0) {
                       showAlert('Por favor, selecciona al menos una fuente de ingresos', 'warning');
                       return false;
                   }
                   break;
                   
               case 2:
                   // Verificar que la suma de gastos no exceda los ingresos
                   const totalExpenses = getTotalExpenses();
                   const monthlyIncome = getNumericValue(`${WIDGET_PREFIX}-monthly-income`);
                   
                   if (totalExpenses > monthlyIncome * 1.1) { // 10% de tolerancia
                       showAlert('Tus gastos superan significativamente tus ingresos. Revisa los montos.', 'warning');
                       return false;
                   }
                   break;
                   
               case 3:
                   // Validación básica de activos
                   const liquidAssets = getNumericValue(`${WIDGET_PREFIX}-liquid-assets`);
                   const emergencyFund = getNumericValue(`${WIDGET_PREFIX}-emergency-fund`);
                   
                   if (liquidAssets < 0 || emergencyFund < 0) {
                       showAlert('Los valores de activos no pueden ser negativos', 'warning');
                       return false;
                   }
                   break;
                   
               case 4:
                   // Validación de deudas
                   const debtPayments = getNumericValue(`${WIDGET_PREFIX}-debt-payments`);
                   const totalDebt = getTotalDebt();
                   
                   if (debtPayments > monthlyIncome * 0.5) {
                       showAlert('El pago de deudas representa más del 50% de tus ingresos. Esto puede ser riesgoso.', 'warning');
                   }
                   break;
           }
           
           return true;
           
       } catch (error) {
           console.error('Error validando paso:', error);
           return false;
       }
   }
   
   function showAlert(message, type = 'warning') {
       // Remover alertas existentes
       const existingAlerts = document.querySelectorAll(`.${WIDGET_PREFIX}-alert-temp`);
       existingAlerts.forEach(alert => alert.remove());
       
       // Crear nueva alerta
       const alert = document.createElement('div');
       alert.className = `${WIDGET_PREFIX}-alert ${WIDGET_PREFIX}-alert-${type} ${WIDGET_PREFIX}-alert-temp`;
       alert.textContent = message;
       
       // Insertar al inicio del paso actual
       const currentStepEl = document.getElementById(`${WIDGET_PREFIX}-step-${currentStep}`);
       if (currentStepEl) {
           currentStepEl.insertBefore(alert, currentStepEl.firstChild.nextSibling);
           
           // Auto-remover después de 5 segundos
           setTimeout(() => {
               if (alert.parentNode) {
                   alert.remove();
               }
           }, 5000);
       }
   }
   
   // Funciones de datos
   function getNumericValue(id) {
       const element = document.getElementById(id);
       if (!element) return 0;
       const value = element.value.replace(/[^\d.-]/g, '');
       return validateNumber(parseFloat(value) || 0);
   }
   
   function getTotalExpenses() {
       return getNumericValue(`${WIDGET_PREFIX}-non-negotiables`) +
              getNumericValue(`${WIDGET_PREFIX}-debt-payments`) +
              getNumericValue(`${WIDGET_PREFIX}-savings`) +
              getNumericValue(`${WIDGET_PREFIX}-investment`) +
              getNumericValue(`${WIDGET_PREFIX}-lifestyle`) +
              getNumericValue(`${WIDGET_PREFIX}-giving`);
   }
   
   function getTotalDebt() {
       return getNumericValue(`${WIDGET_PREFIX}-consumer-debt`) +
              getNumericValue(`${WIDGET_PREFIX}-mortgage-debt`) +
              getNumericValue(`${WIDGET_PREFIX}-other-debt`);
   }
   
   function getTotalAssets() {
       return getNumericValue(`${WIDGET_PREFIX}-liquid-assets`) +
              getNumericValue(`${WIDGET_PREFIX}-illiquid-assets`) +
              getNumericValue(`${WIDGET_PREFIX}-cash`) +
              getNumericValue(`${WIDGET_PREFIX}-emergency-fund`);
   }
   
   // Funciones de cálculo de métricas
   function calculateMetrics() {
       try {
           const income = getNumericValue(`${WIDGET_PREFIX}-edit-income`) || getNumericValue(`${WIDGET_PREFIX}-monthly-income`);
           const nonNegotiables = getNumericValue(`${WIDGET_PREFIX}-edit-non-negotiables`) || getNumericValue(`${WIDGET_PREFIX}-non-negotiables`);
           const debtPayments = getNumericValue(`${WIDGET_PREFIX}-edit-debt-payments`) || getNumericValue(`${WIDGET_PREFIX}-debt-payments`);
           const savings = getNumericValue(`${WIDGET_PREFIX}-edit-savings`) || getNumericValue(`${WIDGET_PREFIX}-savings`);
           const investment = getNumericValue(`${WIDGET_PREFIX}-edit-investment`) || getNumericValue(`${WIDGET_PREFIX}-investment`);
           const lifestyle = getNumericValue(`${WIDGET_PREFIX}-lifestyle`);
           const giving = getNumericValue(`${WIDGET_PREFIX}-giving`);
           
           const totalAssets = getTotalAssets();
           const totalDebt = getTotalDebt();
           const emergencyFund = getNumericValue(`${WIDGET_PREFIX}-emergency-fund`);
           
           // Distribución de ingresos
           const totalExpenses = nonNegotiables + debtPayments + savings + investment + lifestyle + giving;
           const distributionText = income > 0 ? 
               `${Math.round((totalExpenses / income) * 100)}% utilizado` : 'N/A';
           
           // Solvencia (Activos / Pasivos)
           const solvency = totalDebt > 0 ? (totalAssets / totalDebt).toFixed(2) : '∞';
           
           // % Endeudamiento (Deuda / Activos)
           const debtRatio = totalAssets > 0 ? 
               `${Math.round((totalDebt / totalAssets) * 100)}%` : 'N/A';
           
           // % Ingresos a pago de deuda
           const debtToIncome = income > 0 ? 
               `${Math.round((debtPayments / income) * 100)}%` : 'N/A';
           
           // Meses de emergencia
           const monthsOfEmergency = nonNegotiables > 0 ? 
               (emergencyFund / nonNegotiables).toFixed(1) : '0';
           
           // Actualizar UI
           updateMetricDisplay('income-distribution', distributionText);
           updateMetricDisplay('solvency', solvency);
           updateMetricDisplay('debt-ratio', debtRatio);
           updateMetricDisplay('debt-to-income', debtToIncome);
           updateMetricDisplay('emergency-months', `${monthsOfEmergency} meses`);
           
           // Mostrar alertas basadas en métricas
           showMetricAlerts(debtToIncome, monthsOfEmergency, solvency);
           
       } catch (error) {
           console.error('Error calculando métricas:', error);
       }
   }
   
   function updateMetricDisplay(metricId, value) {
       const element = document.getElementById(`${WIDGET_PREFIX}-${metricId}`);
       if (element) {
           element.textContent = value;
       }
   }
   
   function showMetricAlerts(debtToIncome, monthsOfEmergency, solvency) {
       const alertsContainer = document.querySelector(`.${WIDGET_PREFIX}-dashboard-panel`);
       if (!alertsContainer) return;
       
       // Remover alertas anteriores
       const existingAlerts = alertsContainer.querySelectorAll('.metric-alert');
       existingAlerts.forEach(alert => alert.remove());
       
       const alerts = [];
       
       // Alertas por % de deuda a ingresos
       const debtPercent = parseFloat(debtToIncome);
       if (debtPercent > 40) {
           alerts.push({
               type: 'danger',
               message: '⚠️ Tu pago de deudas es muy alto (>40% de ingresos)'
           });
       } else if (debtPercent > 30) {
           alerts.push({
               type: 'warning',
               message: '⚡ Tu pago de deudas está en zona de riesgo (>30%)'
           });
       }
       
       // Alertas por fondo de emergencia
       const months = parseFloat(monthsOfEmergency);
       if (months < 1) {
           alerts.push({
               type: 'danger',
               message: '🚨 Tu fondo de emergencia es insuficiente (<1 mes)'
           });
       } else if (months < 3) {
           alerts.push({
               type: 'warning',
               message: '💡 Considera aumentar tu fondo de emergencia (ideal: 3-6 meses)'
           });
       } else if (months >= 6) {
           alerts.push({
               type: 'success',
               message: '✅ ¡Excelente fondo de emergencia!'
           });
       }
       
       // Alertas por solvencia
       const solvencyRatio = parseFloat(solvency);
       if (solvencyRatio < 1 && solvency !== '∞') {
           alerts.push({
               type: 'danger',
               message: '⚠️ Tus deudas superan tus activos'
           });
       }
       
       // Mostrar alertas
       alerts.forEach((alert, index) => {
           setTimeout(() => {
               const alertEl = document.createElement('div');
               alertEl.className = `${WIDGET_PREFIX}-alert ${WIDGET_PREFIX}-alert-${alert.type} metric-alert`;
               alertEl.textContent = alert.message;
               alertsContainer.appendChild(alertEl);
           }, index * 200);
       });
   }
   
   // Funciones de toggle para secciones editables
   window.toggleSection = function(section) {
       const content = document.getElementById(`${WIDGET_PREFIX}-${section}-content`);
       const toggle = document.getElementById(`${WIDGET_PREFIX}-${section}-toggle`);
       
       if (content && toggle) {
           const isExpanded = content.classList.contains('expanded');
           content.classList.toggle('expanded');
           toggle.textContent = isExpanded ? '+' : '-';
       }
   };
   
   // Funciones de datos persistentes
   function saveData() {
       try {
           const data = {};
           
           // Recoger todos los inputs del widget
           const inputs = document.querySelectorAll(`[id*="${WIDGET_PREFIX}"]`);
           inputs.forEach(input => {
               if (input.type === 'checkbox') {
                   data[input.id] = input.checked;
               } else {
                   data[input.id] = sanitizeInput(input.value);
               }
           });
           
           // Guardar con límite de tamaño
           const dataString = JSON.stringify(data);
           if (dataString.length < 50000) { // Límite de 50KB
               localStorage.setItem(STORAGE_KEY, dataString);
           }
           
       } catch (error) {
           console.warn('No se pudo guardar los datos:', error);
       }
   }
   
   function loadSavedData() {
       try {
           const savedData = localStorage.getItem(STORAGE_KEY);
           if (savedData) {
               const data = JSON.parse(savedData);
               
               Object.keys(data).forEach(key => {
                   const element = document.getElementById(key);
                   if (element) {
                       if (element.type === 'checkbox') {
                           element.checked = data[key];
                       } else {
                           element.value = data[key];
                       }
                   }
               });
           }
       } catch (error) {
           console.warn('No se pudo cargar los datos guardados:', error);
       }
   }
   
   function loadDashboardData() {
       // Cargar datos en los campos editables del dashboard
       const mappings = [
           ['edit-income', 'monthly-income'],
           ['edit-non-negotiables', 'non-negotiables'],
           ['edit-debt-payments', 'debt-payments'],
           ['edit-savings', 'savings'],
           ['edit-investment', 'investment'],
           ['edit-liquid-assets', 'liquid-assets'],
           ['edit-illiquid-assets', 'illiquid-assets']
       ];
       
       mappings.forEach(([editId, sourceId]) => {
           const sourceEl = document.getElementById(`${WIDGET_PREFIX}-${sourceId}`);
           const editEl = document.getElementById(`${WIDGET_PREFIX}-${editId}`);
           
           if (sourceEl && editEl) {
               editEl.value = sourceEl.value;
               // Configurar evento para recalcular en tiempo real
               editEl.addEventListener('input', debounce(calculateMetrics, 500));
           }
       });
   }
   
   function resetWidget() {
       if (confirm('¿Estás seguro de que quieres empezar un nuevo análisis? Se perderán los datos actuales.')) {
           // Limpiar localStorage
           localStorage.removeItem(STORAGE_KEY);
           
           // Reiniciar widget
           currentStep = 1;
           showStep(1);
           
           // Limpiar todos los inputs
           const inputs = document.querySelectorAll(`[id*="${WIDGET_PREFIX}"]`);
           inputs.forEach(input => {
               if (input.type === 'checkbox') {
                   input.checked = false;
               } else {
                   input.value = '';
               }
           });
       }
   }
   
   // Inicializar cuando el DOM esté listo
   if (document.readyState === 'loading') {
       document.addEventListener('DOMContentLoaded', createWidget);
   } else {
       createWidget();
   }
   
})();
