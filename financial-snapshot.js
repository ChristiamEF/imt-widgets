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
            return new Intl.NumberFormat('es-ES', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(num);
        } catch (e) {
            return num.toString();
        }
    }
    
    // Función corregida para parsear números con formato europeo
    function parseFormattedNumber(value) {
        if (typeof value !== 'string') {
            return parseFloat(value) || 0;
        }
        
        // Si está vacío, retornar 0
        if (!value.trim()) return 0;
        
        // Eliminar espacios y caracteres no numéricos excepto puntos, comas y signos negativos
        let cleaned = value.trim().replace(/[^\d.,-]/g, '');
        
        // Si no hay nada después de limpiar, retornar 0
        if (!cleaned) return 0;
        
        // Casos especiales
        if (cleaned === '.' || cleaned === ',' || cleaned === '-') return 0;
        
        // Si tiene tanto punto como coma
        if (cleaned.includes('.') && cleaned.includes(',')) {
            const lastDot = cleaned.lastIndexOf('.');
            const lastComma = cleaned.lastIndexOf(',');
            
            if (lastComma > lastDot) {
                // La coma está después del punto, entonces el punto es separador de miles
                // Ejemplo: 1.000,50
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else {
                // El punto está después de la coma, entonces la coma es separador de miles
                // Ejemplo: 1,000.50
                cleaned = cleaned.replace(/,/g, '');
            }
        } else if (cleaned.includes(',')) {
            // Solo tiene coma
            const commaParts = cleaned.split(',');
            
            if (commaParts.length === 2 && commaParts[1].length <= 2) {
                // Parece ser separador decimal (ej: 123,45)
                cleaned = cleaned.replace(',', '.');
            } else {
                // Parece ser separador de miles (ej: 10,000)
                cleaned = cleaned.replace(/,/g, '');
            }
        } else if (cleaned.includes('.')) {
            // Solo tiene punto
            const dotParts = cleaned.split('.');
            
            // Si hay múltiples puntos o el último grupo tiene más de 2 dígitos, son separadores de miles
            if (dotParts.length > 2 || (dotParts.length === 2 && dotParts[1].length > 2)) {
                // Es separador de miles (ej: 10.000 o 1.000.000)
                cleaned = cleaned.replace(/\./g, '');
            }
            // Si hay solo un punto y máximo 2 decimales, lo dejamos como separador decimal
        }
        
        const result = parseFloat(cleaned) || 0;
        return result;
    }
    
    // Función para generar CSV
    function generateCSVData() {
        const data = {
            // Información básica
            fecha_analisis: new Date().toLocaleDateString('es-ES'),
            
            // Paso 1: Ingresos
            ingresos_mensuales: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-monthly-income`).value),
            estabilidad_ingresos: document.getElementById(`${WIDGET_PREFIX}-income-stability`).value,
            fuente_salario: document.getElementById(`${WIDGET_PREFIX}-source-salary`).checked,
            fuente_freelance: document.getElementById(`${WIDGET_PREFIX}-source-freelance`).checked,
            fuente_negocio: document.getElementById(`${WIDGET_PREFIX}-source-business`).checked,
            fuente_inversiones: document.getElementById(`${WIDGET_PREFIX}-source-investments`).checked,
            fuente_otros: document.getElementById(`${WIDGET_PREFIX}-source-other`).checked,
            
            // Paso 2: Gastos (No Negociables desglosados)
            vivienda: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-housing`).value),
            alimentacion: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-food`).value),
            transporte: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-transport`).value),
            salud_seguros: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-health`).value),
            servicios: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-utilities`).value),
            pagos_deuda: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-debt-payments-detail`).value),
            total_no_negociables: getNonNegotiablesTotal(),
            
            // Otros gastos Big Five
            ahorro: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-savings`).value),
            inversion: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-investment`).value),
            viva_la_vida: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-lifestyle`).value),
            granito_arena: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-giving`).value),
            
            // Paso 3: Activos
            activos_liquidos: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-liquid-assets`).value),
            activos_no_liquidos: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-illiquid-assets`).value),
            efectivo_disponible: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-cash`).value),
            fondo_emergencia: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-emergency-fund`).value),
            total_activos: getTotalAssets(),
            
            // Paso 4: Deudas
            deuda_consumo: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-consumer-debt`).value),
            deuda_hipotecaria: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-mortgage-debt`).value),
            otra_deuda: parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-other-debt`).value),
            total_deudas: getTotalDebt(),
   
            // Calcular métricas usando variables separadas
            const ingresosMensuales = data.ingresos_mensuales;
            const totalGastos = getTotalExpenses();
            const totalDeudas = data.total_deudas;
            const totalActivos = data.total_activos;
            const pagosDeuda = data.pagos_deuda;

            // Agregar métricas calculadas al objeto data
            Object.assign(data, {
                // Métricas calculadas
                total_gastos: totalGastos,
                balance_mensual: ingresosMensuales - totalGastos,
                porcentaje_gastos: ingresosMensuales > 0 ? Math.round((totalGastos / ingresosMensuales) * 100) : 0,
                solvencia: totalDeudas > 0 ? (totalActivos / totalDeudas).toFixed(2) : '∞',
                porcentaje_endeudamiento: totalActivos > 0 ? Math.round((totalDeudas / totalActivos) * 100) : 0,
                porcentaje_deuda_ingresos: ingresosMensuales > 0 ? Math.round((pagosDeuda / ingresosMensuales) * 100) : 0,
                meses_emergencia: (getNonNegotiablesTotal() - pagosDeuda) > 0 ? 
                    (data.fondo_emergencia / (getNonNegotiablesTotal() - pagosDeuda)).toFixed(1) : 0,
                meses_recomendados: getRecommendedEmergencyMonths()
            });
        
        return data;
    }
    
    // Función para descargar CSV
    function downloadCSV() {
        try {
            const data = generateCSVData();
            
            // Crear el contenido CSV
            const csvContent = [
                ['Campo', 'Valor'],
                ['Fecha de Análisis', data.fecha_analisis],
                ['', ''], // Línea vacía
                ['=== INGRESOS ===', ''],
                ['Ingresos Mensuales (€)', data.ingresos_mensuales],
                ['Estabilidad de Ingresos', data.estabilidad_ingresos],
                ['Fuente: Salario', data.fuente_salario ? 'Sí' : 'No'],
                ['Fuente: Freelance', data.fuente_freelance ? 'Sí' : 'No'],
                ['Fuente: Negocio', data.fuente_negocio ? 'Sí' : 'No'],
                ['Fuente: Inversiones', data.fuente_inversiones ? 'Sí' : 'No'],
                ['Fuente: Otros', data.fuente_otros ? 'Sí' : 'No'],
                ['', ''], // Línea vacía
                ['=== NO NEGOCIABLES ===', ''],
                ['Vivienda (€)', data.vivienda],
                ['Alimentación (€)', data.alimentacion],
                ['Transporte (€)', data.transporte],
                ['Salud/Seguros (€)', data.salud_seguros],
                ['Servicios (€)', data.servicios],
                ['Pagos de Deuda (€)', data.pagos_deuda],
                ['Total No Negociables (€)', data.total_no_negociables],
                ['', ''], // Línea vacía
                ['=== OTROS GASTOS ===', ''],
                ['Ahorro (€)', data.ahorro],
                ['Inversión (€)', data.inversion],
                ['Viva la Vida (€)', data.viva_la_vida],
                ['Granito de Arena (€)', data.granito_arena],
                ['', ''], // Línea vacía
                ['=== ACTIVOS ===', ''],
                ['Activos Líquidos (€)', data.activos_liquidos],
                ['Activos No Líquidos (€)', data.activos_no_liquidos],
                ['Efectivo Disponible (€)', data.efectivo_disponible],
                ['Fondo de Emergencia (€)', data.fondo_emergencia],
                ['Total Activos (€)', data.total_activos],
                ['', ''], // Línea vacía
                ['=== DEUDAS ===', ''],
                ['Deuda de Consumo (€)', data.deuda_consumo],
                ['Deuda Hipotecaria (€)', data.deuda_hipotecaria],
                ['Otra Deuda (€)', data.otra_deuda],
                ['Total Deudas (€)', data.total_deudas],
                ['', ''], // Línea vacía
                ['=== MÉTRICAS CALCULADAS ===', ''],
                ['Total Gastos Mensuales (€)', data.total_gastos],
                ['Balance Mensual (€)', data.balance_mensual],
                ['% de Ingresos Gastados', `${data.porcentaje_gastos}%`],
                ['Solvencia (Activos/Deudas)', data.solvencia],
                ['% Endeudamiento', `${data.porcentaje_endeudamiento}%`],
                ['% Ingresos a Pago Deuda', `${data.porcentaje_deuda_ingresos}%`],
                ['Meses de Emergencia Actuales', data.meses_emergencia],
                ['Meses de Emergencia Recomendados', data.meses_recomendados]
            ];
            
            // Convertir a string CSV
            const csvString = csvContent.map(row => 
                row.map(field => 
                    typeof field === 'string' && field.includes(',') ? `"${field}"` : field
                ).join(',')
            ).join('\n');
            
            // Crear y descargar el archivo
            const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `analisis_financiero_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Mostrar mensaje de éxito
            showAlert('¡Archivo CSV descargado exitosamente!', 'success');
            
        } catch (error) {
            console.error('Error generando CSV:', error);
            showAlert('Error al generar el archivo CSV', 'danger');
        }
    }
    
    // Crear el contenedor del widget
    function createWidget() {
        const container = document.getElementById(`${WIDGET_PREFIX}-container`);
        if (!container) return;
        
        // CSS integrado (mantiene todo el CSS anterior)
        const styles = `
            <style>
                .${WIDGET_PREFIX}-widget {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 1000px;
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
                    justify-content: center;
                    gap: 20px;
                    margin-top: 16px;
                    padding: 20px;
                    background: #f8f8f8;
                    border-radius: 12px;
                    border: 1px solid #ddd;
                }
                
                .${WIDGET_PREFIX}-checkbox-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    padding: 16px;
                    background: white;
                    border: 2px solid #000;
                    border-radius: 8px;
                    min-width: 120px;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                
                .${WIDGET_PREFIX}-checkbox-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 4px 4px 0 #000;
                }
                
                .${WIDGET_PREFIX}-checkbox-item.selected {
                    background: #f0f0f0;
                    box-shadow: 4px 4px 0 #000;
                }
                
                .${WIDGET_PREFIX}-checkbox {
                    width: 18px;
                    height: 18px;
                }
                
                .${WIDGET_PREFIX}-checkbox-label {
                    font-weight: 500;
                    text-align: center;
                    font-size: 14px;
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
                
                .${WIDGET_PREFIX}-button-download {
                    background: #28a745;
                    color: white;
                    border: none;
                }
                
                .${WIDGET_PREFIX}-button-download:hover {
                    background: #218838;
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
                    margin-top: 24px;
                }
                
                .${WIDGET_PREFIX}-dashboard.active {
                    display: block;
                }
                
                .${WIDGET_PREFIX}-dashboard-metrics {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 24px;
                    margin-bottom: 32px;
                }
                
                .${WIDGET_PREFIX}-dashboard-edit {
                    background: #f8f8f8;
                    border: 2px solid #000;
                    border-radius: 12px;
                    padding: 24px;
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
                    padding: 12px 0;
                    border-bottom: 1px solid #ddd;
                }
                
                .${WIDGET_PREFIX}-metric:last-child {
                    border-bottom: none;
                }
                
                .${WIDGET_PREFIX}-metric-label {
                    font-weight: 500;
                    font-size: 15px;
                }
                
                .${WIDGET_PREFIX}-metric-value {
                    font-weight: bold;
                    color: #000;
                    font-size: 16px;
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
                    padding: 8px;
                    background: #f0f0f0;
                    border-radius: 4px;
                }
                
                .${WIDGET_PREFIX}-editable-title:hover {
                    background: #e8e8e8;
                }
                
                .${WIDGET_PREFIX}-collapsible-content {
                    display: none;
                    margin-top: 12px;
                }
                
                .${WIDGET_PREFIX}-collapsible-content.expanded {
                    display: block;
                }
                
                .${WIDGET_PREFIX}-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                
                .${WIDGET_PREFIX}-grid-three {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 16px;
                }
                
                .${WIDGET_PREFIX}-full-width {
                    grid-column: 1 / -1;
                }
                
                .${WIDGET_PREFIX}-subcategory {
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 16px;
                    margin-top: 12px;
                }
                
                .${WIDGET_PREFIX}-subcategory-title {
                    font-weight: bold;
                    font-size: 16px;
                    margin-bottom: 12px;
                    color: #333;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 8px;
                }
                
                .${WIDGET_PREFIX}-total-display {
                    background: #f0f0f0;
                    border: 2px solid #000;
                    border-radius: 8px;
                    padding: 12px;
                    margin-top: 16px;
                    font-weight: bold;
                    font-size: 18px;
                    text-align: center;
                }
                
                .${WIDGET_PREFIX}-download-section {
                    background: #f0f8f0;
                    border: 2px solid #28a745;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 24px;
                    text-align: center;
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
                
                .${WIDGET_PREFIX}-alert-info {
                    background: #d1ecf1;
                    border: 2px solid #17a2b8;
                    color: #0c5460;
                }
                
                @media (max-width: 768px) {
                    .${WIDGET_PREFIX}-widget {
                        margin: 10px;
                        padding: 20px;
                    }
                    
                    .${WIDGET_PREFIX}-dashboard-metrics {
                        grid-template-columns: 1fr;
                    }
                    
                    .${WIDGET_PREFIX}-grid, .${WIDGET_PREFIX}-grid-three {
                        grid-template-columns: 1fr;
                    }
                    
                    .${WIDGET_PREFIX}-navigation {
                        flex-direction: column;
                        gap: 12px;
                    }
                    
                    .${WIDGET_PREFIX}-checkbox-group {
                        gap: 12px;
                    }
                    
                    .${WIDGET_PREFIX}-checkbox-item {
                        min-width: 100px;
                        padding: 12px;
                    }
                }
            </style>
        `;
        
        // HTML del widget (incluye todo el HTML anterior más la sección de descarga)
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
                        <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-monthly-income" placeholder="2500">
                    </div>
                    
                    <div class="${WIDGET_PREFIX}-form-group">
                        <label class="${WIDGET_PREFIX}-label">¿De dónde provienen principalmente?</label>
                        <div class="${WIDGET_PREFIX}-checkbox-group">
                            <div class="${WIDGET_PREFIX}-checkbox-item" onclick="toggleCheckbox('${WIDGET_PREFIX}-source-salary')">
                                <input type="checkbox" class="${WIDGET_PREFIX}-checkbox" id="${WIDGET_PREFIX}-source-salary" value="salary">
                                <label class="${WIDGET_PREFIX}-checkbox-label" for="${WIDGET_PREFIX}-source-salary">💼 Salario</label>
                            </div>
                            <div class="${WIDGET_PREFIX}-checkbox-item" onclick="toggleCheckbox('${WIDGET_PREFIX}-source-freelance')">
                                <input type="checkbox" class="${WIDGET_PREFIX}-checkbox" id="${WIDGET_PREFIX}-source-freelance" value="freelance">
                                <label class="${WIDGET_PREFIX}-checkbox-label" for="${WIDGET_PREFIX}-source-freelance">💻 Freelance</label>
                            </div>
                            <div class="${WIDGET_PREFIX}-checkbox-item" onclick="toggleCheckbox('${WIDGET_PREFIX}-source-business')">
                                <input type="checkbox" class="${WIDGET_PREFIX}-checkbox" id="${WIDGET_PREFIX}-source-business" value="business">
                                <label class="${WIDGET_PREFIX}-checkbox-label" for="${WIDGET_PREFIX}-source-business">🏪 Negocio</label>
                            </div>
                            <div class="${WIDGET_PREFIX}-checkbox-item" onclick="toggleCheckbox('${WIDGET_PREFIX}-source-investments')">
                                <input type="checkbox" class="${WIDGET_PREFIX}-checkbox" id="${WIDGET_PREFIX}-source-investments" value="investments">
                                <label class="${WIDGET_PREFIX}-checkbox-label" for="${WIDGET_PREFIX}-source-investments">📈 Inversiones</label>
                            </div>
                            <div class="${WIDGET_PREFIX}-checkbox-item" onclick="toggleCheckbox('${WIDGET_PREFIX}-source-other')">
                                <input type="checkbox" class="${WIDGET_PREFIX}-checkbox" id="${WIDGET_PREFIX}-source-other" value="other">
                                <label class="${WIDGET_PREFIX}-checkbox-label" for="${WIDGET_PREFIX}-source-other">🔗 Otros</label>
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
                   
                   <div class="${WIDGET_PREFIX}-alert ${WIDGET_PREFIX}-alert-info">
                       <strong>The Big Five:</strong> Vamos a clasificar tus gastos en las 5 categorías principales.
                   </div>
                   
                   <!-- No Negociables con subcategorías -->
                   <div class="${WIDGET_PREFIX}-form-group">
                       <label class="${WIDGET_PREFIX}-label">🏠 No Negociables</label>
                       <div class="${WIDGET_PREFIX}-subcategory">
                           <div class="${WIDGET_PREFIX}-subcategory-title">Desglose de No Negociables:</div>
                           <div class="${WIDGET_PREFIX}-grid">
                               <div class="${WIDGET_PREFIX}-form-group">
                                   <label class="${WIDGET_PREFIX}-label">🏠 Vivienda</label>
                                   <input type="text" class="${WIDGET_PREFIX}-input non-negotiable-item" id="${WIDGET_PREFIX}-housing" placeholder="800">
                               </div>
                               <div class="${WIDGET_PREFIX}-form-group">
                                   <label class="${WIDGET_PREFIX}-label">🍽️ Alimentación</label>
                                   <input type="text" class="${WIDGET_PREFIX}-input non-negotiable-item" id="${WIDGET_PREFIX}-food" placeholder="300">
                               </div>
                               <div class="${WIDGET_PREFIX}-form-group">
                                   <label class="${WIDGET_PREFIX}-label">🚗 Transporte</label>
                                   <input type="text" class="${WIDGET_PREFIX}-input non-negotiable-item" id="${WIDGET_PREFIX}-transport" placeholder="150">
                               </div>
                               <div class="${WIDGET_PREFIX}-form-group">
                                   <label class="${WIDGET_PREFIX}-label">🏥 Salud/Seguros</label>
                                   <input type="text" class="${WIDGET_PREFIX}-input non-negotiable-item" id="${WIDGET_PREFIX}-health" placeholder="100">
                               </div>
                               <div class="${WIDGET_PREFIX}-form-group">
                                   <label class="${WIDGET_PREFIX}-label">💡 Servicios</label>
                                   <input type="text" class="${WIDGET_PREFIX}-input non-negotiable-item" id="${WIDGET_PREFIX}-utilities" placeholder="120">
                               </div>
                               <div class="${WIDGET_PREFIX}-form-group">
                                   <label class="${WIDGET_PREFIX}-label">💳 Pagos de Deuda</label>
                                   <input type="text" class="${WIDGET_PREFIX}-input non-negotiable-item" id="${WIDGET_PREFIX}-debt-payments-detail" placeholder="300">
                               </div>
                           </div>
                           <div class="${WIDGET_PREFIX}-total-display">
                               Total No Negociables: <span id="${WIDGET_PREFIX}-non-negotiables-total">€0</span>
                           </div>
                       </div>
                   </div>
                   
                   <div class="${WIDGET_PREFIX}-grid">
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
                           <label class="${WIDGET_PREFIX}-label">💧 Activos Líquidos <em>(sin fondo de emergencia)</em></label>
                           <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-liquid-assets" placeholder="5000">
                           <small>Inversiones que puedes convertir en efectivo rápidamente</small>
                       </div>
                       
                       <div class="${WIDGET_PREFIX}-form-group">
                           <label class="${WIDGET_PREFIX}-label">🏢 Activos No Líquidos</label>
                           <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-illiquid-assets" placeholder="50000">
                           <small>Inmuebles, vehículos, etc.</small>
                       </div>
                       
                       <div class="${WIDGET_PREFIX}-form-group">
                           <label class="${WIDGET_PREFIX}-label">💵 Efectivo Disponible</label>
                           <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-cash" placeholder="1000">
                           <small>Dinero en cuentas corrientes/ahorros</small>
                       </div>
                       
                       <div class="${WIDGET_PREFIX}-form-group">
                           <label class="${WIDGET_PREFIX}-label">🐷 Fondo de Emergencia</label>
                           <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-emergency-fund" placeholder="3000">
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
                           <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-consumer-debt" placeholder="5000">
                           <small>Tarjetas de crédito, préstamos personales</small>
                       </div>
                       
                       <div class="${WIDGET_PREFIX}-form-group">
                           <label class="${WIDGET_PREFIX}-label">🏠 Deuda Hipotecaria</label>
                           <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-mortgage-debt" placeholder="150000">
                           <small>Préstamo de la casa</small>
                       </div>
                       
                       <div class="${WIDGET_PREFIX}-form-group ${WIDGET_PREFIX}-full-width">
                           <label class="${WIDGET_PREFIX}-label">📋 Otro Tipo de Deuda</label>
                           <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-other-debt" placeholder="2000">
                           <small>Préstamos estudiantiles, familiares, etc.</small>
                       </div>
                   </div>
               </div>
               
               <!-- Dashboard -->
               <div class="${WIDGET_PREFIX}-dashboard" id="${WIDGET_PREFIX}-dashboard">
                   <!-- Sección de descarga -->
                   <div class="${WIDGET_PREFIX}-download-section">
                       <h3 class="${WIDGET_PREFIX}-dashboard-title">📥 Exportar Análisis</h3>
                       <p>Descarga tu análisis financiero completo en formato CSV para guardarlo o compartirlo.</p>
                       <button class="${WIDGET_PREFIX}-button ${WIDGET_PREFIX}-button-download" onclick="downloadCSV()">
                           📊 Descargar CSV
                       </button>
                   </div>
                   
                   <!-- Métricas principales -->
                   <div class="${WIDGET_PREFIX}-dashboard-metrics">
                       <div class="${WIDGET_PREFIX}-dashboard-panel">
                           <h3 class="${WIDGET_PREFIX}-dashboard-title">📊 Distribución de Ingresos</h3>
                           <div class="${WIDGET_PREFIX}-metric">
                               <span class="${WIDGET_PREFIX}-metric-label">Total gastado:</span>
                               <span class="${WIDGET_PREFIX}-metric-value" id="${WIDGET_PREFIX}-total-expenses">-</span>
                           </div>
                           <div class="${WIDGET_PREFIX}-metric">
                               <span class="${WIDGET_PREFIX}-metric-label">% de ingresos usado:</span>
                               <span class="${WIDGET_PREFIX}-metric-value" id="${WIDGET_PREFIX}-income-distribution">-</span>
                           </div>
                           <div class="${WIDGET_PREFIX}-metric">
                               <span class="${WIDGET_PREFIX}-metric-label">Sobrante mensual:</span>
                               <span class="${WIDGET_PREFIX}-metric-value" id="${WIDGET_PREFIX}-monthly-surplus">-</span>
                           </div>
                       </div>
                       
                       <div class="${WIDGET_PREFIX}-dashboard-panel">
                           <h3 class="${WIDGET_PREFIX}-dashboard-title">🛡️ Estabilidad Financiera</h3>
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
                       </div>
                       
                       <div class="${WIDGET_PREFIX}-dashboard-panel">
                           <h3 class="${WIDGET_PREFIX}-dashboard-title">🐷 Fondo de Emergencia</h3>
                           <div class="${WIDGET_PREFIX}-metric">
                               <span class="${WIDGET_PREFIX}-metric-label">Meses cubiertos:</span>
                               <span class="${WIDGET_PREFIX}-metric-value" id="${WIDGET_PREFIX}-emergency-months">-</span>
                           </div>
                           <div class="${WIDGET_PREFIX}-metric">
                               <span class="${WIDGET_PREFIX}-metric-label">Recomendado:</span>
                               <span class="${WIDGET_PREFIX}-metric-value" id="${WIDGET_PREFIX}-recommended-months">-</span>
                           </div>
                           <div class="${WIDGET_PREFIX}-metric">
                               <span class="${WIDGET_PREFIX}-metric-label">Estado:</span>
                               <span class="${WIDGET_PREFIX}-metric-value" id="${WIDGET_PREFIX}-emergency-status">-</span>
                           </div>
                       </div>
                   </div>
                   
                   <!-- Sección de edición -->
                   <div class="${WIDGET_PREFIX}-dashboard-edit">
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
                               <div class="${WIDGET_PREFIX}-form-group">
                                   <label class="${WIDGET_PREFIX}-label">Estabilidad de Ingresos</label>
                                   <select class="${WIDGET_PREFIX}-select" id="${WIDGET_PREFIX}-edit-stability">
                                       <option value="very-stable">Muy estables</option>
                                       <option value="stable">Estables</option>
                                       <option value="variable">Variables</option>
                                       <option value="very-variable">Muy variables</option>
                                   </select>
                               </div>
                           </div>
                       </div>
                       
                       <div class="${WIDGET_PREFIX}-editable-section">
                           <div class="${WIDGET_PREFIX}-editable-title" onclick="toggleSection('non-negotiables')">
                               🏠 No Negociables <span id="${WIDGET_PREFIX}-non-negotiables-toggle">+</span>
                           </div>
                           <div class="${WIDGET_PREFIX}-collapsible-content" id="${WIDGET_PREFIX}-non-negotiables-content">
                               <div class="${WIDGET_PREFIX}-grid">
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Vivienda</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input edit-non-negotiable" id="${WIDGET_PREFIX}-edit-housing">
                                   </div>
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Alimentación</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input edit-non-negotiable" id="${WIDGET_PREFIX}-edit-food">
                                   </div>
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Transporte</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input edit-non-negotiable" id="${WIDGET_PREFIX}-edit-transport">
                                   </div>
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Salud/Seguros</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input edit-non-negotiable" id="${WIDGET_PREFIX}-edit-health">
                                   </div>
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Servicios</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input edit-non-negotiable" id="${WIDGET_PREFIX}-edit-utilities">
                                   </div>
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Pagos de Deuda</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input edit-non-negotiable" id="${WIDGET_PREFIX}-edit-debt-payments">
                                   </div>
                               </div>
                           </div>
                       </div>
                       
                       <div class="${WIDGET_PREFIX}-editable-section">
                           <div class="${WIDGET_PREFIX}-editable-title" onclick="toggleSection('big-five')">
                               💸 Otros Gastos (Big Five) <span id="${WIDGET_PREFIX}-big-five-toggle">+</span>
                           </div>
                           <div class="${WIDGET_PREFIX}-collapsible-content" id="${WIDGET_PREFIX}-big-five-content">
                               <div class="${WIDGET_PREFIX}-grid">
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Ahorro</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-savings">
                                   </div>
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Inversión</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-investment">
                                   </div>
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Viva la Vida</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-lifestyle">
                                   </div>
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Granito de Arena</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-giving">
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
                                       <label class="${WIDGET_PREFIX}-label">Activos Líquidos</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-liquid-assets">
                                   </div>
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Activos No Líquidos</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-illiquid-assets">
                                   </div>
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Efectivo Disponible</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-cash">
                                   </div>
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Fondo de Emergencia</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-emergency-fund">
                                   </div>
                               </div>
                           </div>
                       </div>
                       
                       <div class="${WIDGET_PREFIX}-editable-section">
                           <div class="${WIDGET_PREFIX}-editable-title" onclick="toggleSection('debts')">
                               💳 Deudas <span id="${WIDGET_PREFIX}-debts-toggle">+</span>
                           </div>
                           <div class="${WIDGET_PREFIX}-collapsible-content" id="${WIDGET_PREFIX}-debts-content">
                               <div class="${WIDGET_PREFIX}-grid">
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Deuda de Consumo</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-consumer-debt">
                                   </div>
                                   <div class="${WIDGET_PREFIX}-form-group">
                                       <label class="${WIDGET_PREFIX}-label">Deuda Hipotecaria</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-mortgage-debt">
                                   </div>
                                   <div class="${WIDGET_PREFIX}-form-group ${WIDGET_PREFIX}-full-width">
                                       <label class="${WIDGET_PREFIX}-label">Otra Deuda</label>
                                       <input type="text" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-edit-other-debt">
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
           
           // Configurar cálculo automático de No Negociables
           setupNonNegotiablesCalculation();
           
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
               const value = parseFormattedNumber(this.value);
               if (value > 0) {
                   this.value = formatNumber(value);
               }
           });
           
           // Al entrar al campo, quitar formato y mostrar número plano
           input.addEventListener('focus', function() {
               const value = parseFormattedNumber(this.value);
               if (value > 0) {
                   this.value = value.toString();
               }
           });
       });
   }
   
   function setupNonNegotiablesCalculation() {
       const nonNegotiableInputs = document.querySelectorAll('.non-negotiable-item');
       const editNonNegotiableInputs = document.querySelectorAll('.edit-non-negotiable');
       
       function updateNonNegotiablesTotal() {
           let total = 0;
           nonNegotiableInputs.forEach(input => {
               total += parseFormattedNumber(input.value);
           });
           
           const totalDisplay = document.getElementById(`${WIDGET_PREFIX}-non-negotiables-total`);
           if (totalDisplay) {
               totalDisplay.textContent = formatCurrency(total);
           }
       }
       
       function updateEditNonNegotiablesTotal() {
           let total = 0;
           editNonNegotiableInputs.forEach(input => {
               total += parseFormattedNumber(input.value);
           });
           calculateMetrics();
       }
       
       nonNegotiableInputs.forEach(input => {
           input.addEventListener('input', debounce(updateNonNegotiablesTotal, 300));
           input.addEventListener('blur', updateNonNegotiablesTotal);
       });
       
       editNonNegotiableInputs.forEach(input => {
           input.addEventListener('input', debounce(updateEditNonNegotiablesTotal, 300));
           input.addEventListener('blur', updateEditNonNegotiablesTotal);
       });
       
       // Cálculo inicial
       updateNonNegotiablesTotal();
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
   
   // Función para toggle de checkboxes
   window.toggleCheckbox = function(checkboxId) {
       const checkbox = document.getElementById(checkboxId);
       const container = checkbox.closest(`.${WIDGET_PREFIX}-checkbox-item`);
       
       if (checkbox && container) {
           checkbox.checked = !checkbox.checked;
           container.classList.toggle('selected', checkbox.checked);
           saveData();
       }
   };
   
   // Función para descargar CSV (expuesta globalmente)
   window.downloadCSV = downloadCSV;
   
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
                   
                   if (!income || parseFormattedNumber(income) <= 0) {
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
                   const monthlyIncome = parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-monthly-income`).value);
                   
                   if (totalExpenses > monthlyIncome * 1.1) { // 10% de tolerancia
                       showAlert('Tus gastos superan significativamente tus ingresos. Revisa los montos.', 'warning');
                       return false;
                   }
                   break;
                   
               case 3:
                   // Validación básica de activos
                   const liquidAssets = parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-liquid-assets`).value);
                   const emergencyFund = parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-emergency-fund`).value);
                   
                   if (liquidAssets < 0 || emergencyFund < 0) {
                       showAlert('Los valores de activos no pueden ser negativos', 'warning');
                       return false;
                   }
                   break;
                   
               case 4:
                   // Validación de deudas
                   const debtPayments = parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-debt-payments-detail`).value);
                   const monthlyIncomeStep4 = parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-monthly-income`).value);
                   
                   if (debtPayments > monthlyIncomeStep4 * 0.5) {
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
       
       // Insertar al inicio del paso actual o dashboard
       let targetContainer;
       if (currentStep <= totalSteps) {
           targetContainer = document.getElementById(`${WIDGET_PREFIX}-step-${currentStep}`);
       } else {
           targetContainer = document.getElementById(`${WIDGET_PREFIX}-dashboard`);
       }
       
       if (targetContainer) {
           targetContainer.insertBefore(alert, targetContainer.firstChild.nextSibling);
           
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
       return parseFormattedNumber(element.value);
   }
   
   function getNonNegotiablesTotal() {
       const nonNegotiableIds = [
           `${WIDGET_PREFIX}-housing`,
           `${WIDGET_PREFIX}-food`,
           `${WIDGET_PREFIX}-transport`,
           `${WIDGET_PREFIX}-health`,
           `${WIDGET_PREFIX}-utilities`,
           `${WIDGET_PREFIX}-debt-payments-detail`
       ];
       
       return nonNegotiableIds.reduce((total, id) => {
           return total + getNumericValue(id);
       }, 0);
   }
   
   function getEditNonNegotiablesTotal() {
       const editNonNegotiableIds = [
           `${WIDGET_PREFIX}-edit-housing`,
           `${WIDGET_PREFIX}-edit-food`,
           `${WIDGET_PREFIX}-edit-transport`,
           `${WIDGET_PREFIX}-edit-health`,
           `${WIDGET_PREFIX}-edit-utilities`,
           `${WIDGET_PREFIX}-edit-debt-payments`
       ];
       
       return editNonNegotiableIds.reduce((total, id) => {
           return total + getNumericValue(id);
       }, 0);
   }
   
   function getTotalExpenses() {
       const nonNegotiables = getNonNegotiablesTotal();
       return nonNegotiables +
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
   
   function getRecommendedEmergencyMonths() {
       const stability = document.getElementById(`${WIDGET_PREFIX}-income-stability`).value ||
                        document.getElementById(`${WIDGET_PREFIX}-edit-stability`).value;
       
       if (stability === 'very-stable' || stability === 'stable') {
           return 3;
       } else {
           return 6;
       }
   }
   
   // Funciones de cálculo de métricas
   function calculateMetrics() {
       try {
           const income = getNumericValue(`${WIDGET_PREFIX}-edit-income`) || 
                         parseFormattedNumber(document.getElementById(`${WIDGET_PREFIX}-monthly-income`).value);
           
           const nonNegotiables = getEditNonNegotiablesTotal() || getNonNegotiablesTotal();
           const savings = getNumericValue(`${WIDGET_PREFIX}-edit-savings`) || 
                          getNumericValue(`${WIDGET_PREFIX}-savings`);
           const investment = getNumericValue(`${WIDGET_PREFIX}-edit-investment`) || 
                             getNumericValue(`${WIDGET_PREFIX}-investment`);
           const lifestyle = getNumericValue(`${WIDGET_PREFIX}-edit-lifestyle`) || 
                            getNumericValue(`${WIDGET_PREFIX}-lifestyle`);
           const giving = getNumericValue(`${WIDGET_PREFIX}-edit-giving`) || 
                         getNumericValue(`${WIDGET_PREFIX}-giving`);
           
           const totalAssets = getNumericValue(`${WIDGET_PREFIX}-edit-liquid-assets`) + 
                              getNumericValue(`${WIDGET_PREFIX}-edit-illiquid-assets`) + 
                              getNumericValue(`${WIDGET_PREFIX}-edit-cash`) + 
                              getNumericValue(`${WIDGET_PREFIX}-edit-emergency-fund`) || getTotalAssets();
           
           const totalDebt = getNumericValue(`${WIDGET_PREFIX}-edit-consumer-debt`) + 
                            getNumericValue(`${WIDGET_PREFIX}-edit-mortgage-debt`) + 
                            getNumericValue(`${WIDGET_PREFIX}-edit-other-debt`) || getTotalDebt();
           
           const emergencyFund = getNumericValue(`${WIDGET_PREFIX}-edit-emergency-fund`) || 
                                getNumericValue(`${WIDGET_PREFIX}-emergency-fund`);
           
           const debtPayments = getNumericValue(`${WIDGET_PREFIX}-edit-debt-payments`) || 
                               getNumericValue(`${WIDGET_PREFIX}-debt-payments-detail`);
           
           // Cálculos
           const totalExpenses = nonNegotiables + savings + investment + lifestyle + giving;
           const monthlyBalance = income - totalExpenses;
           const expenseRatio = income > 0 ? (totalExpenses / income) * 100 : 0;
           
           const solvency = totalDebt > 0 ? (totalAssets / totalDebt).toFixed(2) : '∞';
           const debtRatio = totalAssets > 0 ? Math.round((totalDebt / totalAssets) * 100) : 0;
           const debtToIncome = income > 0 ? Math.round((debtPayments / income) * 100) : 0;
           
           // Fondo de emergencia
           const nonNegotiablesForEmergency = nonNegotiables - debtPayments; // Sin incluir pagos de deuda para el cálculo
           const monthsOfEmergency = nonNegotiablesForEmergency > 0 ? 
               (emergencyFund / nonNegotiablesForEmergency).toFixed(1) : '0';
           
           const recommendedMonths = getRecommendedEmergencyMonths();
           const emergencyStatus = parseFloat(monthsOfEmergency) >= recommendedMonths ? 
               '✅ Excelente' : parseFloat(monthsOfEmergency) >= recommendedMonths * 0.5 ? 
               '⚠️ Mejorando' : '🚨 Insuficiente';
           
           // Actualizar UI
           updateMetricDisplay('total-expenses', formatCurrency(totalExpenses));
           updateMetricDisplay('income-distribution', `${Math.round(expenseRatio)}%`);
           updateMetricDisplay('monthly-surplus', formatCurrency(monthlyBalance));
           updateMetricDisplay('solvency', solvency);
           updateMetricDisplay('debt-ratio', `${debtRatio}%`);
           updateMetricDisplay('debt-to-income', `${debtToIncome}%`);
           updateMetricDisplay('emergency-months', `${monthsOfEmergency} meses`);
           updateMetricDisplay('recommended-months', `${recommendedMonths} meses`);
           updateMetricDisplay('emergency-status', emergencyStatus);
           
           // Mostrar alertas basadas en métricas
           showMetricAlerts(debtToIncome, parseFloat(monthsOfEmergency), recommendedMonths, monthlyBalance);
           
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
   
   function showMetricAlerts(debtToIncome, monthsOfEmergency, recommendedMonths, monthlyBalance) {
       const alertsContainer = document.querySelector(`.${WIDGET_PREFIX}-dashboard-metrics`);
       if (!alertsContainer) return;
       
       // Remover alertas anteriores
       const existingAlerts = alertsContainer.querySelectorAll('.metric-alert');
       existingAlerts.forEach(alert => alert.remove());
       
       const alerts = [];
       
       // Alertas por balance mensual
       if (monthlyBalance < 0) {
           alerts.push({
               type: 'danger',
               message: '🚨 Tus gastos superan tus ingresos mensuales'
           });
       } else if (monthlyBalance < 100) {
           alerts.push({
               type: 'warning',
               message: '⚠️ Tu margen mensual es muy ajustado'
           });
       } else if (monthlyBalance > 500) {
           alerts.push({
               type: 'success',
               message: '✅ ¡Excelente gestión de gastos!'
           });
       }
       
       // Alertas por % de deuda a ingresos
       if (debtToIncome > 40) {
           alerts.push({
               type: 'danger',
               message: '⚠️ Tu pago de deudas es muy alto (>40% de ingresos)'
           });
       } else if (debtToIncome > 30) {
           alerts.push({
               type: 'warning',
               message: '⚡ Tu pago de deudas está en zona de riesgo (>30%)'
           });
       }
       
       // Alertas por fondo de emergencia
       if (monthsOfEmergency < 1) {
           alerts.push({
               type: 'danger',
               message: '🚨 Tu fondo de emergencia es crítico (<1 mes)'
           });
       } else if (monthsOfEmergency < recommendedMonths) {
           const deficit = (recommendedMonths - monthsOfEmergency).toFixed(1);
           alerts.push({
               type: 'warning',
               message: `💡 Te faltan ${deficit} meses de fondo de emergencia para llegar al recomendado`
           });
       } else if (monthsOfEmergency >= recommendedMonths) {
           alerts.push({
               type: 'success',
               message: '✅ ¡Tu fondo de emergencia está en excelente estado!'
           });
       }
       
       // Mostrar alertas
       alerts.forEach((alert, index) => {
           setTimeout(() => {
               const alertEl = document.createElement('div');
               alertEl.className = `${WIDGET_PREFIX}-alert ${WIDGET_PREFIX}-alert-${alert.type} metric-alert`;
               alertEl.textContent = alert.message;
               alertEl.style.marginTop = '16px';
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
                           // Actualizar el estilo visual del checkbox
                           const container = element.closest(`.${WIDGET_PREFIX}-checkbox-item`);
                           if (container) {
                               container.classList.toggle('selected', element.checked);
                           }
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
       // Mapeo de campos para cargar en el dashboard
       const mappings = [
           // Ingresos
           ['edit-income', 'monthly-income'],
           ['edit-stability', 'income-stability'],
           
           // No Negociables
           ['edit-housing', 'housing'],
           ['edit-food', 'food'],
           ['edit-transport', 'transport'],
           ['edit-health', 'health'],
           ['edit-utilities', 'utilities'],
           ['edit-debt-payments', 'debt-payments-detail'],
           
           // Big Five
           ['edit-savings', 'savings'],
           ['edit-investment', 'investment'],
           ['edit-lifestyle', 'lifestyle'],
           ['edit-giving', 'giving'],
           
           // Activos
           ['edit-liquid-assets', 'liquid-assets'],
           ['edit-illiquid-assets', 'illiquid-assets'],
           ['edit-cash', 'cash'],
           ['edit-emergency-fund', 'emergency-fund'],
           
           // Deudas
           ['edit-consumer-debt', 'consumer-debt'],
           ['edit-mortgage-debt', 'mortgage-debt'],
           ['edit-other-debt', 'other-debt']
       ];
       
       mappings.forEach(([editId, sourceId]) => {
           const sourceEl = document.getElementById(`${WIDGET_PREFIX}-${sourceId}`);
           const editEl = document.getElementById(`${WIDGET_PREFIX}-${editId}`);
           
           if (sourceEl && editEl) {
               editEl.value = sourceEl.value;
               
               // Configurar evento para recalcular en tiempo real
               editEl.addEventListener('input', debounce(calculateMetrics, 500));
               editEl.addEventListener('blur', calculateMetrics);
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
                   const container = input.closest(`.${WIDGET_PREFIX}-checkbox-item`);
                   if (container) {
                       container.classList.remove('selected');
                   }
               } else {
                   input.value = '';
               }
           });
           
           // Limpiar total de No Negociables
           const totalDisplay = document.getElementById(`${WIDGET_PREFIX}-non-negotiables-total`);
           if (totalDisplay) {
               totalDisplay.textContent = '€0';
           }
       }
   }
   
   // Inicializar cuando el DOM esté listo
   if (document.readyState === 'loading') {
       document.addEventListener('DOMContentLoaded', createWidget);
   } else {
       createWidget();
   }
   
})();
