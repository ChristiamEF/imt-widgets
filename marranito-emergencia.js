/**
 * ============================================================================
 * WIDGET: Marranito de Emergencia
 * Autor: It's Money Time
 * Versión: 1.0.0
 * Fecha: 13 de Febrero, 2026
 * ============================================================================
 * 
 * DESCRIPCIÓN:
 * Calculadora interactiva para determinar el fondo de emergencia ideal basado
 * en gastos no negociables, perfil de ingresos y situación financiera personal.
 * 
 * CARACTERÍSTICAS:
 * - Cálculo personalizado de meses de colchón financiero
 * - Análisis de perfil de ingresos
 * - Categorización inteligente de gastos
 * - Exportación a PDF
 * - Persistencia local de datos
 * 
 * DEPENDENCIAS:
 * - jsPDF 2.5.1 (carga dinámica para exportación PDF)
 * 
 * SEGURIDAD:
 * - ✅ 100% Client-side (no envía datos externos)
 * - ✅ Todos los inputs sanitizados y validados
 * - ✅ Datos guardados solo en localStorage del navegador
 * - ✅ Sin acceso a cookies o información sensible
 * - ✅ Validación de tipos y rangos en todas las entradas
 * 
 * LICENCIA: MIT
 * Copyright (c) 2025 It's Money Time
 * ============================================================================
 */

(function() {
    'use strict';
    
    const WIDGET_PREFIX = 'imt-marranito';
    const STORAGE_KEY = `${WIDGET_PREFIX}-data-v2`;
    const VERSION = '2.6.0';
    
    // ========================================================================
    // 1. CONFIGURACIÓN Y DATOS
    // ========================================================================
    
    const CONFIG = {
        MAX_CUSTOM_NNS: 3,
        MAX_INPUT_VALUE: 999999999,
        MIN_INPUT_VALUE: 0,
        DEBOUNCE_DELAY: 300,
        MAX_STRING_LENGTH: 100
    };
    
    const MONEDAS = [
        { codigo: 'EUR', simbolo: '€', nombre: 'Euro', locale: 'es-ES' },
        { codigo: 'USD', simbolo: '$', nombre: 'Dólar', locale: 'en-US' },
        { codigo: 'MXN', simbolo: '$', nombre: 'Peso MX', locale: 'es-MX' },
        { codigo: 'COP', simbolo: '$', nombre: 'Peso CO', locale: 'es-CO' }
    ];
    
    const GLOSARIO = {
        'nns': {
            termino: 'Gastos No Negociables (NNs)',
            definicion: 'Lo que SÍ o SÍ tienes que pagar para no quedarte sin techo, comida o luz. Punto.',
            ejemplo: '✅ Alquiler, comida básica, transporte al trabajo<br>❌ Netflix, delivery, gym premium'
        },
        'marranito': {
            termino: 'Marranito de Emergencia',
            definicion: 'Tu colchón financiero para cuando la vida te sorprenda. Solo se toca en VERDADERAS emergencias.',
            ejemplo: 'Desempleo, enfermedad seria, reparación urgente. NO es para vacaciones ni caprichos.'
        },
        'liquidez': {
            termino: 'Liquidez',
            definicion: 'Dinero que puedes agarrar HOY sin perder ni un céntimo. Cero trabas, cero penalizaciones.',
            ejemplo: '✅ Cuenta de ahorros, cuenta corriente<br>❌ Fondos de inversión, criptos, depósitos a plazo'
        },
        'perfil-riesgo': {
            termino: 'Perfil de Riesgo',
            definicion: 'Qué tan frágil está tu situación financiera. Básicamente: ¿qué tan rápido te quedas en la calle si pierdes tu trabajo?',
            ejemplo: 'Freelance con 2 hijos = Alto riesgo (necesitas más meses guardados)<br>Funcionario sin dependientes = Menor riesgo'
        },
        'pago-minimo': {
            termino: 'Pago Mínimo',
            definicion: 'Lo MÍNIMO que pagas en tus deudas para no arruinar tu historial crediticio. En modo supervivencia, esto es lo que importa.',
            ejemplo: 'No estamos liquidando deudas, solo mantenemos la cabeza fuera del agua.'
        },
        'elefantes': {
            termino: 'Gastos Elefante',
            definicion: 'Esos gastos grandes que YA SABES que vienen en el año, pero que siempre te agarran desprevenido y te pisan el bolsillo.',
            ejemplo: '✅ Seguro del auto, impuestos, matrícula escolar, cambio de llantas<br>❌ No son emergencias sorpresa, estos ya los ves venir'
        }
    };
    
    const CATEGORIAS_NNS = {
        techo: {
            id: 'techo', icono: 'home', titulo: 'Techo', descripcion: 'Vivienda y suministros',
            subcategorias: [
                { id: 'vivienda', label: 'Alquiler o Hipoteca', placeholder: '800' },
                { id: 'servicios', label: 'Servicios (Luz, Agua)', placeholder: '120' },
                { id: 'internet', label: 'Internet/Teléfono', placeholder: '40' }
            ]
        },
        supervivencia: {
            id: 'supervivencia', icono: 'shopping_basket', titulo: 'Supervivencia', descripcion: 'Lo mínimo para vivir',
            subcategorias: [
                { id: 'comida', label: 'Supermercado', placeholder: '300' },
                { id: 'salud', label: 'Farmacia / Salud', placeholder: '50' }
            ]
        },
        movilidad: {
            id: 'movilidad', icono: 'commute', titulo: 'Movilidad', descripcion: 'Transporte indispensable',
            subcategorias: [
                { id: 'transporte', label: 'Transporte / Gasolina', placeholder: '80' }
            ]
        },
        elefantes: {
            id: 'elefantes', icono: 'calendar_month', titulo: 'Elefantes', descripcion: 'Gastos anuales / 12',
            info: 'El sistema divide entre 12 automáticamente',
            definicion: 'Esos gastos grandes que YA SABES que vienen en el año, pero que siempre te agarran desprevenido y te pisan el bolsillo.',
            subcategorias: [
                { id: 'seguros', label: 'Seguros (Anuales)', placeholder: '600', esAnual: true },
                { id: 'impuestos', label: 'Impuestos (Anuales)', placeholder: '400', esAnual: true }
            ]
        }
    };

    // ========================================================================
    // 2. UTILIDADES DE SEGURIDAD Y PERFORMANCE
    // ========================================================================
    
    /**
     * Sanitiza un string eliminando caracteres peligrosos
     * @param {string} input - String a sanitizar
     * @returns {string} - String sanitizado
     */
    function sanitizeString(input) {
        if (typeof input !== 'string') return '';
        // Eliminar caracteres peligrosos para XSS
        return input
            .replace(/[<>\"'&]/g, '')
            .slice(0, CONFIG.MAX_STRING_LENGTH)
            .trim();
    }
    
    /**
     * Sanitiza HTML convirtiendo a texto plano
     * @param {string} html - HTML a sanitizar
     * @returns {string} - HTML sanitizado
     */
    function sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
    
    /**
     * Valida y sanitiza un número dentro de un rango
     * @param {*} value - Valor a validar
     * @param {number} min - Valor mínimo
     * @param {number} max - Valor máximo
     * @returns {number} - Número validado
     */
    function validateNumber(value, min = CONFIG.MIN_INPUT_VALUE, max = CONFIG.MAX_INPUT_VALUE) {
        const num = parseFloat(value);
        if (isNaN(num)) return 0;
        return Math.max(min, Math.min(max, num));
    }
    
    /**
     * Debounce para optimizar llamadas frecuentes
     * @param {Function} func - Función a ejecutar
     * @param {number} wait - Tiempo de espera en ms
     * @returns {Function} - Función debounced
     */
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
    
    /**
     * Cache simple para queries DOM repetitivas
     */
    const DOMCache = {
        _cache: {},
        get(selector) {
            if (!this._cache[selector]) {
                this._cache[selector] = document.querySelectorAll(selector);
            }
            return this._cache[selector];
        },
        clear() {
            this._cache = {};
        }
    };

    // ========================================================================
    // 3. ESTILOS CSS (DISEÑO CLEAN / TRADE REPUBLIC STYLE)
    // ========================================================================
    
    const styles = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0');

            :root {
                --imt-font: 'Inter', sans-serif;
                --imt-bg: #FFFFFF;
                --imt-card-bg: #FFFFFF;
                --imt-input-bg: #F1F5F9;
                --imt-text-main: #0F172A;
                --imt-text-muted: #64748B;
                --imt-black: #000000;
                --imt-white: #FFFFFF;
                --imt-border: #E2E8F0;
                --imt-radius-lg: 20px;
                --imt-radius-xl: 28px;
                --imt-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            }

            .${WIDGET_PREFIX}-widget * { box-sizing: border-box; margin: 0; padding: 0; outline: none; -webkit-font-smoothing: antialiased; border-radius: 24px;}

            .${WIDGET_PREFIX}-widget {
                font-family: var(--imt-font);
                max-width: 800px;
                margin: 0 auto;
                background: var(--imt-bg);
                color: var(--imt-text-main);
                border-radius: 36px;
                padding: 40px 36px;
                line-height: 1.5;
            }

            .${WIDGET_PREFIX}-header { text-align: center; margin-bottom: 48px; }
            .${WIDGET_PREFIX}-icon-box {
                width: 80px; height: 80px; background: var(--imt-card-bg); border: 1px solid var(--imt-border);
                border-radius: 24px; display: inline-flex; align-items: center; justify-content: center;
                margin-bottom: 24px; box-shadow: var(--imt-shadow);
            }
            .${WIDGET_PREFIX}-icon-box span { font-size: 40px; color: var(--imt-text-main); }
            .${WIDGET_PREFIX}-title { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
            .${WIDGET_PREFIX}-subtitle { font-size: 16px; color: var(--imt-text-muted); font-weight: 500; }

            .${WIDGET_PREFIX}-progress {
                display: flex; align-items: center; justify-content: space-between; position: relative; margin-bottom: 40px; padding: 0 10px;
            }
            .${WIDGET_PREFIX}-progress-line { position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: var(--imt-border); z-index: 0; }
            .${WIDGET_PREFIX}-progress-step {
                width: 32px; height: 32px; background: var(--imt-bg); border: 2px solid var(--imt-border); border-radius: 50%;
                display: flex; align-items: center; justify-content: center; position: relative; z-index: 1;
                font-size: 12px; font-weight: 700; transition: all 0.3s ease;
            }
            .${WIDGET_PREFIX}-progress-step.active { border-color: var(--imt-black); background: var(--imt-black); color: var(--imt-white); transform: scale(1.1); }
            .${WIDGET_PREFIX}-progress-step.completed { background: var(--imt-black); border-color: var(--imt-black); color: var(--imt-white); }

            .${WIDGET_PREFIX}-step { display: none; animation: slideUp 0.4s ease; }
            .${WIDGET_PREFIX}-step.active { display: block; }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

            .${WIDGET_PREFIX}-step-title { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
            .${WIDGET_PREFIX}-step-desc { font-size: 16px; color: var(--imt-text-muted); margin-bottom: 32px; line-height: 1.6; }

            .${WIDGET_PREFIX}-card {
                background: var(--imt-card-bg); border: 1px solid var(--imt-border); border-radius: var(--imt-radius-xl);
                padding: 24px; margin-bottom: 16px; box-shadow: var(--imt-shadow); transition: transform 0.2s;
            }
            .${WIDGET_PREFIX}-card-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
            .${WIDGET_PREFIX}-card-icon {
                width: 48px; height: 48px; background: var(--imt-input-bg); border-radius: 16px;
                display: flex; align-items: center; justify-content: center; flex-shrink: 0;
            }

            .${WIDGET_PREFIX}-form-group { margin-bottom: 16px; }
            .${WIDGET_PREFIX}-label {
                display: flex; align-items: center; gap: 6px; font-size: 11px; text-transform: uppercase;
                letter-spacing: 0.05em; font-weight: 700; color: var(--imt-text-muted); margin-bottom: 8px;
            }
            .${WIDGET_PREFIX}-input-wrapper { position: relative; }
            .${WIDGET_PREFIX}-input, .${WIDGET_PREFIX}-select {
                width: 100%; padding: 16px; padding-right: 40px; background: var(--imt-input-bg); border: 2px solid transparent;
                border-radius: 16px; font-size: 16px; font-weight: 500; font-family: inherit; color: var(--imt-text-main); transition: all 0.2s;
            }
            .${WIDGET_PREFIX}-input:focus, .${WIDGET_PREFIX}-select:focus {
                background: var(--imt-card-bg); border-color: var(--imt-black); box-shadow: 0 0 0 4px rgba(0,0,0,0.05);
            }
            .${WIDGET_PREFIX}-suffix { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-weight: 600; color: var(--imt-text-muted); }

            .${WIDGET_PREFIX}-tooltip-trigger {
                background: var(--imt-text-muted); color: white; border-radius: 50%; width: 16px; height: 16px;
                font-size: 10px; display: inline-flex; align-items: center; justify-content: center; cursor: help; border: none; position: relative;
            }
            .${WIDGET_PREFIX}-tooltip-content {
                display: none; position: absolute; bottom: 120%; left: 50%; transform: translateX(-50%);
                background: #1E293B; color: white; padding: 12px; border-radius: 12px; width: 220px; z-index: 100;
                font-size: 12px; text-transform: none; font-weight: 400; text-align: left; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            }
            .${WIDGET_PREFIX}-tooltip-trigger:hover .${WIDGET_PREFIX}-tooltip-content { display: block; }
            .${WIDGET_PREFIX}-tooltip-example { margin-top: 8px; font-size: 11px; opacity: 0.8; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); }

            .${WIDGET_PREFIX}-btn {
                width: 100%; padding: 18px; border-radius: 24px; font-weight: 700; font-size: 16px; cursor: pointer;
                border: none; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
            }
            .${WIDGET_PREFIX}-btn-primary { background: var(--imt-black); color: var(--imt-white); }
            .${WIDGET_PREFIX}-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
            .${WIDGET_PREFIX}-btn-secondary { background: transparent; border: 2px solid var(--imt-border); color: var(--imt-text-muted); }
            .${WIDGET_PREFIX}-btn-secondary:hover { border-color: var(--imt-text-main); color: var(--imt-text-main); background: var(--imt-card-bg); }
            
            .${WIDGET_PREFIX}-btn-add {
                background: #F8FAFC; border: 2px dashed var(--imt-border); color: var(--imt-text-muted); border-radius: 20px;
                flex-direction: column; padding: 24px; margin-top: 16px;
            }
            .${WIDGET_PREFIX}-btn-add:hover { background: var(--imt-card-bg); border-color: var(--imt-text-main); color: var(--imt-text-main); }

            .${WIDGET_PREFIX}-radio-option {
                display: flex; align-items: center; padding: 20px; background: var(--imt-card-bg); border: 2px solid var(--imt-bg);
                border-radius: 20px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s;
            }
            .${WIDGET_PREFIX}-radio-option:hover { border-color: var(--imt-border); }
            .${WIDGET_PREFIX}-radio-option.selected { border-color: var(--imt-black); background: #F8FAFC; box-shadow: 0 0 0 1px var(--imt-black); }
            .${WIDGET_PREFIX}-radio-circle {
                width: 22px; height: 22px; border: 2px solid var(--imt-border); border-radius: 50%; margin-right: 16px; position: relative;
            }
            .${WIDGET_PREFIX}-radio-option.selected .${WIDGET_PREFIX}-radio-circle { border-color: var(--imt-black); }
            .${WIDGET_PREFIX}-radio-option.selected .${WIDGET_PREFIX}-radio-circle::after {
                content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; background: var(--imt-black); border-radius: 50%;
            }

            .${WIDGET_PREFIX}-sticky-total {
                position: sticky; bottom: 0; left: 0; right: 0; background: #124ab4; color: var(--imt-white); padding: 24px; border-radius: 32px;
                text-align: center; margin: 32px 0; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); z-index: 100;
            }
            .${WIDGET_PREFIX}-sticky-total h2 { font-size: 48px; font-weight: 800; line-height: 1; margin: 8px 0; }
            .${WIDGET_PREFIX}-sticky-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7; font-weight: 700; }

            .${WIDGET_PREFIX}-nav { display: flex; gap: 16px; margin-top: 40px; }
            
            .${WIDGET_PREFIX}-marranito-visual { font-size: 80px; text-align: center; margin: 24px 0; animation: bounce 3s infinite; }
            @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

            .${WIDGET_PREFIX}-alert {
                background: #FEF2F2; border: 1px solid #FCA5A5; color: #991B1B; padding: 12px; border-radius: 12px;
                font-size: 14px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
            }

            @media (max-width: 600px) {
                .${WIDGET_PREFIX}-nav { flex-direction: column-reverse; }
            }
        </style>
    `;

    // ========================================================================
    // 4. ESTRUCTURA HTML (PLANTILLA BASE)
    // ========================================================================
    
    const htmlContent = `
        <div class="${WIDGET_PREFIX}-widget">
            <header class="${WIDGET_PREFIX}-header">
                <div class="${WIDGET_PREFIX}-icon-box">
                    <span class="material-symbols-outlined">savings</span>
                </div>
                <h1 class="${WIDGET_PREFIX}-title">Tu Marranito de Emergencia</h1>
                <p class="${WIDGET_PREFIX}-subtitle">Contruye tu colchoncito financiero</p>
            </header>
            
            <div class="${WIDGET_PREFIX}-progress">
                <div class="${WIDGET_PREFIX}-progress-line"></div>
                ${[1,2,3,4,5,6].map(i => `
                    <div class="${WIDGET_PREFIX}-progress-step" data-step-indicator="${i}">${i}</div>
                `).join('')}
            </div>
            
            <div id="${WIDGET_PREFIX}-steps-container">
                
                <div class="${WIDGET_PREFIX}-step active" data-step="1">
                    <div class="${WIDGET_PREFIX}-step-desc" style="text-align: center;">
                        <p>Si tus ingresos se detuvieran hoy, ¿cuánto tiempo podrías vivir sin pedirle al vecino?</p>
                    </div>
                    
                    <div class="${WIDGET_PREFIX}-card">
                        <div class="${WIDGET_PREFIX}-card-header">
                            <div class="${WIDGET_PREFIX}-card-icon"><span class="material-symbols-outlined">public</span></div>
                            <div>
                                <h3 style="font-weight: 700;">Configuración</h3>
                                <p style="font-size: 12px; color: var(--imt-text-muted);">Selecciona tu moneda</p>
                            </div>
                        </div>
                        <div class="${WIDGET_PREFIX}-input-wrapper">
                            <select class="${WIDGET_PREFIX}-select" id="${WIDGET_PREFIX}-currency">
                                ${MONEDAS.map(m => `<option value="${m.codigo}">${sanitizeHTML(m.nombre)} (${m.simbolo})</option>`).join('')}
                            </select>
                        </div>
                        <div style="margin-top: 16px; font-size: 13px; color: var(--imt-text-muted); background: var(--imt-bg); padding: 12px; border-radius: 12px;">
                            <strong>💡 ${GLOSARIO.marranito.termino}:</strong> ${GLOSARIO.marranito.definicion}
                        </div>
                    </div>
                </div>
                
                <div class="${WIDGET_PREFIX}-step" data-step="2">
                    <h2 class="${WIDGET_PREFIX}-step-title">Tus No Negociables (NNs)</h2>
                    <p class="${WIDGET_PREFIX}-step-desc">
                        Lo mínimo que necesitas para vivir sin drama.
                        <button class="${WIDGET_PREFIX}-tooltip-trigger" aria-label="Más información sobre Gastos No Negociables"> ?
                            <div class="${WIDGET_PREFIX}-tooltip-content">
                                <strong>${GLOSARIO.nns.termino}</strong><br>
                                ${GLOSARIO.nns.definicion}
                                <div class="${WIDGET_PREFIX}-tooltip-example">${GLOSARIO.nns.ejemplo}</div>
                            </div>
                        </button>
                    </p>
                    
                    <div id="${WIDGET_PREFIX}-categories-render"></div>
                    
                    <button type="button" class="${WIDGET_PREFIX}-btn ${WIDGET_PREFIX}-btn-add" id="${WIDGET_PREFIX}-add-custom">
                        <span class="material-symbols-outlined" style="font-size: 32px; margin-bottom: 8px;">add_circle</span>
                        <strong>Añadir otro gasto vital</strong>
                        <span style="font-size: 11px;">Ej: Manutención, Medicinas</span>
                    </button>
                    <div id="${WIDGET_PREFIX}-custom-list" style="margin-top: 16px;"></div>

                    <div class="${WIDGET_PREFIX}-sticky-total">
                        <div class="${WIDGET_PREFIX}-sticky-label">Costo de Vida No Negociable</div>
                        <h2 id="${WIDGET_PREFIX}-total-nns">0 €</h2>
                    </div>
                </div>
                
                <div class="${WIDGET_PREFIX}-step" data-step="3">
                    <h2 class="${WIDGET_PREFIX}-step-title">La Mochila (Deudas)</h2>
                    <p class="${WIDGET_PREFIX}-step-desc">
                        ¿Tienes pagos obligatorios? Solo el pago mínimo.
                        <button class="${WIDGET_PREFIX}-tooltip-trigger" aria-label="Más información sobre Pago Mínimo">?
                            <div class="${WIDGET_PREFIX}-tooltip-content">
                                <strong>${GLOSARIO['pago-minimo'].termino}</strong><br>
                                ${GLOSARIO['pago-minimo'].definicion}
                            </div>
                        </button>
                    </p>
                    
                    <div class="${WIDGET_PREFIX}-card">
                        <div class="${WIDGET_PREFIX}-card-header">
                            <div class="${WIDGET_PREFIX}-card-icon"><span class="material-symbols-outlined">credit_card</span></div>
                            <div>
                                <h3 style="font-weight: 700;">Pagos Mínimos</h3>
                                <p style="font-size: 12px; color: var(--imt-text-muted);">Para no entrar en mora</p>
                            </div>
                        </div>
                        <div class="${WIDGET_PREFIX}-input-wrapper">
                            <input type="number" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-deudas" placeholder="0" min="0" max="${CONFIG.MAX_INPUT_VALUE}">
                            <span class="${WIDGET_PREFIX}-suffix currency-symbol">€</span>
                        </div>
                    </div>
                    
                    <div class="${WIDGET_PREFIX}-sticky-total" style="background: #124ab4;">
                        <div class="${WIDGET_PREFIX}-sticky-label">Gasto Real Mensual (NNs + Deudas)</div>
                        <h2 id="${WIDGET_PREFIX}-total-real">0 €</h2>
                    </div>
                </div>
                
                <div class="${WIDGET_PREFIX}-step" data-step="4">
                    <h2 class="${WIDGET_PREFIX}-step-title">Perfil de Riesgo</h2>
                    <p class="${WIDGET_PREFIX}-step-desc">
                        Ajustemos tu escudo según tu vida.
                        <button class="${WIDGET_PREFIX}-tooltip-trigger" aria-label="Más información sobre Perfil de Riesgo">?
                            <div class="${WIDGET_PREFIX}-tooltip-content">
                                <strong>${GLOSARIO['perfil-riesgo'].termino}</strong><br>
                                ${GLOSARIO['perfil-riesgo'].definicion}
                            </div>
                        </button>
                    </p>
                    
                    <div class="${WIDGET_PREFIX}-form-group">
                        <label class="${WIDGET_PREFIX}-label">Tus Ingresos</label>
                        <div class="${WIDGET_PREFIX}-radio-option" data-group="ingresos" data-value="fijo">
                            <div class="${WIDGET_PREFIX}-radio-circle"></div>
                            <div><strong>Nómina Fija</strong><br><span style="font-size: 12px; color: var(--imt-text-muted);">Estable</span></div>
                        </div>
                        <div class="${WIDGET_PREFIX}-radio-option" data-group="ingresos" data-value="variable">
                            <div class="${WIDGET_PREFIX}-radio-circle"></div>
                            <div><strong>Variables / Autónomo</strong><br><span style="font-size: 12px; color: var(--imt-text-muted);">Fluctúan</span></div>
                        </div>
                    </div>

                    <div class="${WIDGET_PREFIX}-form-group">
                        <label class="${WIDGET_PREFIX}-label">Dependientes</label>
                        <div class="${WIDGET_PREFIX}-radio-option" data-group="dependientes" data-value="sin">
                            <div class="${WIDGET_PREFIX}-radio-circle"></div> <strong>Sin dependientes</strong>
                        </div>
                        <div class="${WIDGET_PREFIX}-radio-option" data-group="dependientes" data-value="con">
                            <div class="${WIDGET_PREFIX}-radio-circle"></div> <strong>Con dependientes (Hijos/Padres)</strong>
                        </div>
                    </div>
                    
                    <div class="${WIDGET_PREFIX}-form-group">
                        <label class="${WIDGET_PREFIX}-label">Pareja</label>
                        <div class="${WIDGET_PREFIX}-radio-option" data-group="pareja" data-value="ambos">
                            <div class="${WIDGET_PREFIX}-radio-circle"></div> <strong>Ambos aportan ingresos</strong>
                        </div>
                        <div class="${WIDGET_PREFIX}-radio-option" data-group="pareja" data-value="solo-yo">
                            <div class="${WIDGET_PREFIX}-radio-circle"></div> <strong>Solo yo aporto / Sin pareja</strong>
                        </div>
                        <div class="${WIDGET_PREFIX}-radio-option" data-group="pareja" data-value="sin">
                            <div class="${WIDGET_PREFIX}-radio-circle"></div> <strong>Sin pareja</strong>
                        </div>
                    </div>
                    
                    <div id="${WIDGET_PREFIX}-risk-feedback" style="display:none; background: #FFF; padding: 24px; border-radius: 24px; border: 2px dashed var(--imt-border); margin-top: 24px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                            <strong>Base Técnica:</strong>
                            <strong id="${WIDGET_PREFIX}-months-base">-- meses</strong>
                        </div>
                        <label class="${WIDGET_PREFIX}-label">Ajuste de Tranquilidad (Extra)</label>
                        <input type="range" style="width: 100%; accent-color: black;" min="0" max="6" value="0" id="${WIDGET_PREFIX}-slider-extra">
                        <div style="text-align: center; font-weight: 700; margin-top: 8px;" id="${WIDGET_PREFIX}-slider-text">+0 meses</div>
                    </div>
                </div>
                
                <div class="${WIDGET_PREFIX}-step" data-step="5">
                    <h2 class="${WIDGET_PREFIX}-step-title">La Panza (Liquidez)</h2>
                    <p class="${WIDGET_PREFIX}-step-desc">
                        ¿Cuánto dinero tienes <strong>disponible hoy</strong>?
                        <button class="${WIDGET_PREFIX}-tooltip-trigger" aria-label="Más información sobre Liquidez">?
                            <div class="${WIDGET_PREFIX}-tooltip-content">
                                <strong>${GLOSARIO.liquidez.termino}</strong><br>
                                ${GLOSARIO.liquidez.definicion}
                            </div>
                        </button>
                    </p>
                    
                    <div class="${WIDGET_PREFIX}-card">
                        <div class="${WIDGET_PREFIX}-card-header">
                            <div class="${WIDGET_PREFIX}-card-icon"><span class="material-symbols-outlined">account_balance_wallet</span></div>
                            <div>
                                <h3 style="font-weight: 700;">Liquidez Actual</h3>
                                <p style="font-size: 12px; color: var(--imt-text-muted);">Efectivo o cuentas a la vista</p>
                            </div>
                        </div>
                        <div class="${WIDGET_PREFIX}-input-wrapper">
                            <input type="number" class="${WIDGET_PREFIX}-input" id="${WIDGET_PREFIX}-liquidez" placeholder="0" min="0" max="${CONFIG.MAX_INPUT_VALUE}">
                            <span class="${WIDGET_PREFIX}-suffix currency-symbol">€</span>
                        </div>
                    </div>
                </div>
                
                <div class="${WIDGET_PREFIX}-step" data-step="6">
                    <div style="text-align: center;">
                        <div class="${WIDGET_PREFIX}-marranito-visual" id="${WIDGET_PREFIX}-final-emoji">🐷</div>
                        <h2 class="${WIDGET_PREFIX}-step-title">Tu Diagnóstico</h2>
                        <p class="${WIDGET_PREFIX}-step-desc">Aquí está tu realidad financiera</p>
                    </div>
                    
                    <div class="${WIDGET_PREFIX}-card" style="text-align: center;">
                        <div class="${WIDGET_PREFIX}-label" style="justify-content: center;">SOBREVIVIRÍAS</div>
                        <h2 style="font-size: 48px; font-weight: 800; margin: 8px 0;" id="${WIDGET_PREFIX}-result-time">--</h2>
                        <p style="color: var(--imt-text-muted);">con tus ahorros actuales</p>
                    </div>
                    
                    <div class="${WIDGET_PREFIX}-card" style="text-align: center; background: #124ab4; color: white; border: none;">
                        <div class="${WIDGET_PREFIX}-label" style="justify-content: center; color: rgba(255,255,255,0.6);">MARRANITO IDEAL</div>
                        <h2 style="font-size: 48px; font-weight: 800; margin: 24px 0 0 0; line-height: 1;" id="${WIDGET_PREFIX}-result-goal">
                            <span>0 €</span>
                            <span style="font-size: 12px; font-weight: 400; opacity: 0.7; display: block; margin: 0 0 8px 0;" id="${WIDGET_PREFIX}-result-months">-- meses</span>
                        </h2>
                        <div id="${WIDGET_PREFIX}-result-gap" style="background: rgba(255,255,255,0.15); display: inline-block; padding: 6px 16px; border-radius: 99px; font-size: 14px; margin-top: 20px;"></div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px;">
                        <button class="${WIDGET_PREFIX}-btn ${WIDGET_PREFIX}-btn-secondary" id="${WIDGET_PREFIX}-btn-restart">
                            <span class="material-symbols-outlined">restart_alt</span> Reiniciar
                        </button>
                        <button class="${WIDGET_PREFIX}-btn ${WIDGET_PREFIX}-btn-primary" id="${WIDGET_PREFIX}-btn-pdf">
                            <span class="material-symbols-outlined">download</span> PDF
                        </button>
                    </div>
                </div>
                
            </div>
            
            <div class="${WIDGET_PREFIX}-nav">
                <button class="${WIDGET_PREFIX}-btn ${WIDGET_PREFIX}-btn-secondary" id="${WIDGET_PREFIX}-btn-prev">Atrás</button>
                <button class="${WIDGET_PREFIX}-btn ${WIDGET_PREFIX}-btn-primary" id="${WIDGET_PREFIX}-btn-next">Siguiente</button>
            </div>
            
            <div style="text-align: center; margin-top: 40px; border-top: 1px solid var(--imt-border); padding-top: 24px;">
                 <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--imt-text-muted); font-weight: 600;">
                    It's Money Time — Finanzas Minimalistas
                </p>
            </div>
        </div>
    `;

    // ========================================================================
    // 5. ESTADO GLOBAL Y GESTIÓN
    // ========================================================================
    
    const State = {
        step: 1,
        currency: 'EUR',
        nns: {
            techo: { vivienda: 0, servicios: 0, internet: 0 },
            supervivencia: { comida: 0, salud: 0 },
            movilidad: { transporte: 0 },
            elefantes: { seguros: 0, impuestos: 0 },
            personalizados: []
        },
        deudas: 0,
        perfil: { ingresos: null, dependientes: null, pareja: null, mesesBase: 3, mesesExtra: 0 },
        liquidez: 0
    };

    /**
     * Guarda el estado en localStorage de forma segura
     */
    function save() {
        try {
            const dataString = JSON.stringify(State);
            
            // Verificar tamaño (límite 5MB)
            if (dataString.length > 5000000) {
                console.warn('Datos demasiado grandes para localStorage');
                return false;
            }
            
            localStorage.setItem(STORAGE_KEY, dataString);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('Cuota de localStorage excedida');
            }
            console.error('Error guardando datos:', error);
            return false;
        }
    }
    
    /**
     * Carga el estado desde localStorage de forma segura
     */
    function load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return null;
            
            const parsed = JSON.parse(data);
            
            // Validar estructura básica
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('Datos inválidos');
            }
            
            // Sanitizar datos personalizados
            if (parsed.nns && Array.isArray(parsed.nns.personalizados)) {
                parsed.nns.personalizados = parsed.nns.personalizados.map(item => ({
                    nombre: sanitizeString(item.nombre || ''),
                    monto: validateNumber(item.monto, 0, CONFIG.MAX_INPUT_VALUE)
                }));
            }
            
            return parsed;
        } catch (error) {
            console.error('Error cargando datos:', error);
            return null;
        }
    }

    // ========================================================================
    // 6. FUNCIONES AUXILIARES
    // ========================================================================
    
    /**
     * Formatea un número como moneda
     */
    function formatMoney(amount) {
        const m = MONEDAS.find(x => x.codigo === State.currency) || MONEDAS[0];
        return new Intl.NumberFormat(m.locale, { 
            style: 'currency', 
            currency: m.codigo, 
            maximumFractionDigits: 0 
        }).format(amount);
    }
    
    /**
     * Obtiene el símbolo de la moneda actual
     */
    function getSymbol() {
        return MONEDAS.find(x => x.codigo === State.currency).simbolo;
    }
    
    /**
     * Actualiza todos los símbolos de moneda en el DOM (optimizado con cache)
     */
    function updateCurrencySymbols() {
        const symbols = document.querySelectorAll('.currency-symbol');
        const symbol = getSymbol();
        symbols.forEach(el => el.textContent = symbol);
    }

    // ========================================================================
    // 7. RENDERIZADO Y UI
    // ========================================================================
    
    /**
     * Renderiza las categorías de gastos NNs (Paso 2) con event delegation
     */
    function renderStep2() {
        const container = document.getElementById(`${WIDGET_PREFIX}-categories-render`);
        if(!container) return;
        
        container.innerHTML = Object.values(CATEGORIAS_NNS).map(cat => `
            <div class="${WIDGET_PREFIX}-card">
                <div class="${WIDGET_PREFIX}-card-header">
                    <div class="${WIDGET_PREFIX}-card-icon">
                        <span class="material-symbols-outlined">${cat.icono}</span>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <h3 style="font-weight: 700;">${sanitizeHTML(cat.titulo)}</h3>
                            ${cat.definicion ? `
                                <button class="${WIDGET_PREFIX}-tooltip-trigger" type="button" aria-label="Más información">?
                                    <div class="${WIDGET_PREFIX}-tooltip-content">
                                        <strong>${sanitizeHTML(cat.titulo)}</strong><br>
                                        ${cat.definicion}
                                    </div>
                                </button>
                            ` : ''}
                        </div>
                        <p style="font-size: 12px; color: var(--imt-text-muted);">${sanitizeHTML(cat.descripcion)}</p>
                    </div>
                </div>
                ${cat.subcategorias.map(sub => `
                    <div class="${WIDGET_PREFIX}-form-group">
                        <label class="${WIDGET_PREFIX}-label">${sanitizeHTML(sub.label)} 
                            ${sub.esAnual ? '<span style="font-size:9px; opacity:0.6;">(ANUAL ÷ 12)</span>' : ''}
                        </label>
                        <div class="${WIDGET_PREFIX}-input-wrapper">
                            <input type="number" 
                                class="${WIDGET_PREFIX}-input nn-input" 
                                data-cat="${cat.id}" 
                                data-sub="${sub.id}" 
                                placeholder="${sub.placeholder}"
                                min="0"
                                max="${CONFIG.MAX_INPUT_VALUE}"
                                value="${State.nns[cat.id]?.[sub.id] || ''}">
                            <span class="${WIDGET_PREFIX}-suffix currency-symbol">${getSymbol()}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
        
        // Event delegation optimizado para todos los inputs NNs
        const debouncedUpdate = debounce(() => {
            updateTotals();
            save();
        }, CONFIG.DEBOUNCE_DELAY);
        
        container.addEventListener('input', (e) => {
            if (e.target.classList.contains('nn-input')) {
                const { cat, sub } = e.target.dataset;
                const value = validateNumber(e.target.value);
                State.nns[cat][sub] = value;
                debouncedUpdate();
            }
        });
        
        renderCustoms();
    }
    
    /**
     * Renderiza los gastos personalizados (optimizado)
     */
    function renderCustoms() {
        const list = document.getElementById(`${WIDGET_PREFIX}-custom-list`);
        if(!list) return;
        
        // Solo re-renderizar si hay cambios
        const currentHTML = list.innerHTML;
        const newHTML = State.nns.personalizados.map((item, idx) => `
            <div class="${WIDGET_PREFIX}-card" style="padding: 16px; display: flex; gap: 12px; align-items: center;">
                <input type="text" 
                    class="${WIDGET_PREFIX}-input custom-name-input" 
                    placeholder="Nombre" 
                    value="${sanitizeHTML(item.nombre)}"
                    maxlength="${CONFIG.MAX_STRING_LENGTH}"
                    data-idx="${idx}">
                <input type="number" 
                    class="${WIDGET_PREFIX}-input custom-monto-input" 
                    placeholder="0" 
                    value="${item.monto || ''}"
                    min="0"
                    max="${CONFIG.MAX_INPUT_VALUE}"
                    data-idx="${idx}">
                <button class="custom-remove-btn" 
                    data-idx="${idx}"
                    style="border:none; background:none; cursor:pointer; color: var(--imt-text-muted); font-size: 20px;"
                    aria-label="Eliminar gasto">✕</button>
            </div>
        `).join('');
        
        if (currentHTML !== newHTML) {
            list.innerHTML = newHTML;
            setupCustomListeners(list);
        }
    }
    
    /**
     * Configura listeners para gastos personalizados con event delegation
     */
    function setupCustomListeners(list) {
        const debouncedUpdate = debounce(() => {
            updateTotals();
            save();
        }, CONFIG.DEBOUNCE_DELAY);
        
        // Event delegation para todos los inputs y botones de custom
        list.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            if (isNaN(idx)) return;
            
            if (e.target.classList.contains('custom-name-input')) {
                State.nns.personalizados[idx].nombre = sanitizeString(e.target.value);
                save();
            } else if (e.target.classList.contains('custom-monto-input')) {
                State.nns.personalizados[idx].monto = validateNumber(e.target.value);
                debouncedUpdate();
            }
        });
        
        list.addEventListener('click', (e) => {
            if (e.target.classList.contains('custom-remove-btn')) {
                const idx = parseInt(e.target.dataset.idx);
                if (!isNaN(idx)) {
                    State.nns.personalizados.splice(idx, 1);
                    renderCustoms();
                    updateTotals();
                    save();
                }
            }
        });
    }

    /**
     * Actualiza los totales mostrados
     */
    function updateTotals() {
        let total = 0;
        
        // Sumar Categorías
        Object.keys(CATEGORIAS_NNS).forEach(catId => {
            const def = CATEGORIAS_NNS[catId];
            def.subcategorias.forEach(sub => {
                let val = State.nns[catId][sub.id] || 0;
                if(sub.esAnual) val = val / 12;
                total += val;
            });
        });
        
        // Sumar Custom
        State.nns.personalizados.forEach(p => total += (p.monto || 0));
        
        // Actualizar UI
        const totalNNsEl = document.getElementById(`${WIDGET_PREFIX}-total-nns`);
        const totalRealEl = document.getElementById(`${WIDGET_PREFIX}-total-real`);
        
        if (totalNNsEl) totalNNsEl.textContent = formatMoney(total);
        if (totalRealEl) totalRealEl.textContent = formatMoney(total + State.deudas);
        
        return total;
    }

    /**
     * Configura listeners del perfil de riesgo (Paso 4)
     */
    function setupProfileListeners() {
        // Event delegation para radio options
        document.addEventListener('click', (e) => {
            const option = e.target.closest(`.${WIDGET_PREFIX}-radio-option`);
            if (!option) return;
            
            const group = option.dataset.group;
            const value = option.dataset.value;
            
            if (group && value) {
                State.perfil[group] = value;
                
                // Actualizar UI
                document.querySelectorAll(`[data-group="${group}"]`).forEach(el => 
                    el.classList.remove('selected')
                );
                option.classList.add('selected');
                
                checkProfile();
                save();
            }
        });
        
        // Slider de meses extra
        const slider = document.getElementById(`${WIDGET_PREFIX}-slider-extra`);
        if (slider) {
            slider.addEventListener('input', (e) => {
                State.perfil.mesesExtra = parseInt(e.target.value);
                const textEl = document.getElementById(`${WIDGET_PREFIX}-slider-text`);
                if (textEl) {
                    textEl.textContent = `+${State.perfil.mesesExtra} meses extra`;
                }
                save();
            });
        }
    }

    /**
     * Verifica y calcula el perfil de riesgo
     */
    function checkProfile() {
        const p = State.perfil;
        if(p.ingresos && p.dependientes && p.pareja) {
            let base = 3;
            if(p.ingresos === 'variable') base += 3;
            if(p.dependientes === 'con') base += 2;
            if(p.pareja === 'solo-yo') base += 1;
            if(p.pareja === 'ambos') base -= 1;
            base = Math.max(3, base);
            
            State.perfil.mesesBase = base;
            
            const feedbackEl = document.getElementById(`${WIDGET_PREFIX}-risk-feedback`);
            const monthsBaseEl = document.getElementById(`${WIDGET_PREFIX}-months-base`);
            
            if (feedbackEl) feedbackEl.style.display = 'block';
            if (monthsBaseEl) monthsBaseEl.textContent = `${base} meses`;
        }
    }

    /**
     * Restaura el UI del perfil desde el estado guardado
     */
    function restoreProfileUI() {
        const p = State.perfil;
        
        if(p.ingresos) {
            const el = document.querySelector(`[data-group="ingresos"][data-value="${p.ingresos}"]`);
            if (el) el.classList.add('selected');
        }
        if(p.dependientes) {
            const el = document.querySelector(`[data-group="dependientes"][data-value="${p.dependientes}"]`);
            if (el) el.classList.add('selected');
        }
        if(p.pareja) {
            const el = document.querySelector(`[data-group="pareja"][data-value="${p.pareja}"]`);
            if (el) el.classList.add('selected');
        }
        
        if(p.ingresos) checkProfile();
        
        const slider = document.getElementById(`${WIDGET_PREFIX}-slider-extra`);
        const sliderText = document.getElementById(`${WIDGET_PREFIX}-slider-text`);
        
        if (slider) slider.value = p.mesesExtra;
        if (sliderText) sliderText.textContent = `+${p.mesesExtra} meses extra`;
    }

    // ========================================================================
    // 8. NAVEGACIÓN
    // ========================================================================
    
    /**
     * Navega a un paso específico
     */
    function goToStep(n) {
        if(n < 1 || n > 6) return;
        
        // Validaciones
        if(n === 3 && updateTotals() === 0) {
            alert("⚠️ Por favor, ingresa al menos un gasto para que podamos calcular.");
            return;
        }
        if(n === 5 && !State.perfil.mesesBase) {
            alert("⚠️ Por favor, responde todas las preguntas del perfil.");
            return;
        }

        State.step = n;
        
        // Actualizar steps
        document.querySelectorAll(`.${WIDGET_PREFIX}-step`).forEach(el => 
            el.classList.remove('active')
        );
        const currentStep = document.querySelector(`.${WIDGET_PREFIX}-step[data-step="${n}"]`);
        if (currentStep) currentStep.classList.add('active');
        
        // Actualizar progress bar
        document.querySelectorAll(`.${WIDGET_PREFIX}-progress-step`).forEach((el, idx) => {
            el.classList.remove('active', 'completed');
            if(idx + 1 === n) {
                el.classList.add('active');
            }
            if(idx + 1 < n) {
                el.classList.add('completed');
                el.textContent = '✓';
            } else {
                el.textContent = idx + 1;
            }
        });
        
        // Actualizar botones de navegación
        const prevBtn = document.getElementById(`${WIDGET_PREFIX}-btn-prev`);
        const nextBtn = document.getElementById(`${WIDGET_PREFIX}-btn-next`);
        
        if (prevBtn) prevBtn.style.visibility = n === 1 ? 'hidden' : 'visible';
        if (nextBtn) {
            nextBtn.style.display = n === 6 ? 'none' : 'block';
            nextBtn.textContent = n === 5 ? 'Ver Diagnóstico' : 'Siguiente';
        }
        
        if(n === 6) showResults();
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        save();
    }

    /**
     * Muestra los resultados finales
     */
    function showResults() {
        const mensual = updateTotals() + State.deudas;
        const mesesMeta = State.perfil.mesesBase + State.perfil.mesesExtra;
        const metaDinero = mensual * mesesMeta;
        const liquidez = State.liquidez;
        
        // Calcular tiempo de supervivencia
        let tiempo = 0;
        if(mensual > 0) tiempo = liquidez / mensual;
        
        let tiempoTexto = tiempo < 1 
            ? Math.round(tiempo * 30) + ' días' 
            : tiempo.toFixed(1) + ' meses';
        
        // Actualizar UI
        const resultTimeEl = document.getElementById(`${WIDGET_PREFIX}-result-time`);
        const resultGoalEl = document.getElementById(`${WIDGET_PREFIX}-result-goal`);
        const resultMonthsEl = document.getElementById(`${WIDGET_PREFIX}-result-months`);

        

        
        if (resultTimeEl) resultTimeEl.textContent = tiempoTexto;
        if (resultGoalEl) resultGoalEl.querySelector('span:first-child').textContent = formatMoney(metaDinero);
        if (resultMonthsEl) resultMonthsEl.textContent = `${mesesMeta} meses de colchón`;
        
        // Emoji según estado
        const emojiEl = document.getElementById(`${WIDGET_PREFIX}-final-emoji`);
        if (emojiEl) {
            if(tiempo < 1) emojiEl.textContent = '🐣';
            else if(tiempo < mesesMeta) emojiEl.textContent = '🐷';
            else emojiEl.textContent = '🐷🦸';
        }

        // Gap
        const gap = metaDinero - liquidez;
        const gapEl = document.getElementById(`${WIDGET_PREFIX}-result-gap`);
        
        if (gapEl) {
            if(gap <= 0) {
                gapEl.textContent = '¡Felicidades! Meta Cumplida 🎉';
                gapEl.style.color = '#4ade80';
            } else {
                gapEl.textContent = `Te faltan ${formatMoney(gap)}`;
                gapEl.style.color = 'white';
            }
        }
    }

    // ========================================================================
    // 9. EXPORTACIÓN PDF
    // ========================================================================
    
    /**
     * Genera y descarga el PDF con el plan
     */
    async function generatePDF() {
        const btn = document.getElementById(`${WIDGET_PREFIX}-btn-pdf`);
        if (!btn) return;
        
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Generando...';
        btn.disabled = true;
        
        try {
            // Cargar librería si no existe
            if(!window.jspdf) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                    script.crossOrigin = 'anonymous';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const mensual = updateTotals() + State.deudas;
            const mesesMeta = State.perfil.mesesBase + State.perfil.mesesExtra;
            const metaDinero = mensual * mesesMeta;
            
            // Contenido del PDF
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text("Plan del Marranito de Emergencia", 20, 20);
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 20, 30);
            
            // Sección Realidad
            doc.setFillColor(240, 240, 240);
            doc.rect(20, 40, 170, 10, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text("TU REALIDAD ACTUAL", 25, 47);
            
            doc.setFont('helvetica', 'normal');
            doc.text(`Gasto Mensual Total: ${formatMoney(mensual)}`, 20, 60);
            doc.text(`Liquidez Disponible: ${formatMoney(State.liquidez)}`, 20, 70);
            
            // Sección Meta
            doc.setFillColor(240, 240, 240);
            doc.rect(20, 85, 170, 10, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text("TU META BLINDADA", 25, 92);
            
            doc.setFont('helvetica', 'normal');
            doc.text(`Meses objetivo (Perfil): ${mesesMeta} meses`, 20, 105);
            doc.text(`Monto Total Ideal: ${formatMoney(metaDinero)}`, 20, 115);
            
            if(metaDinero > State.liquidez) {
                doc.setTextColor(200, 0, 0);
                doc.text(`Faltante: ${formatMoney(metaDinero - State.liquidez)}`, 20, 130);
            } else {
                doc.setTextColor(0, 128, 0);
                doc.text(`¡Objetivo Completado!`, 20, 130);
            }
            
            doc.save("Mi-Marranito-Plan.pdf");
            
        } catch (e) {
            console.error('Error generando PDF:', e);
            alert("❌ Error al generar PDF. Por favor, intenta nuevamente.");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // ========================================================================
    // 10. INICIALIZACIÓN
    // ========================================================================
    
    /**
     * Inicializa el widget
     */
    function init() {
        const container = document.getElementById(`${WIDGET_PREFIX}-container`);
        if(!container) {
            console.error(`Contenedor ${WIDGET_PREFIX}-container no encontrado`);
            return;
        }
        
        // Inyectar CSS y HTML
        container.innerHTML = styles + htmlContent;
        
        // Cargar estado guardado
        const saved = load();
        if(saved) {
            Object.assign(State, saved);
        }
        
        // Configurar UI inicial
        const currencySelect = document.getElementById(`${WIDGET_PREFIX}-currency`);
        if (currencySelect) currencySelect.value = State.currency;
        
        updateCurrencySymbols();
        
        const deudasInput = document.getElementById(`${WIDGET_PREFIX}-deudas`);
        const liquidezInput = document.getElementById(`${WIDGET_PREFIX}-liquidez`);
        
        if (deudasInput) deudasInput.value = State.deudas || '';
        if (liquidezInput) liquidezInput.value = State.liquidez || '';
        
        // Renderizar step 2
        renderStep2();
        
        // Setup listeners
        setupProfileListeners();
        restoreProfileUI();
        updateTotals();
        
        // Listeners generales con debouncing
        if (currencySelect) {
            currencySelect.addEventListener('change', (e) => {
                State.currency = e.target.value;
                updateCurrencySymbols();
                updateTotals();
                save();
            });
        }
        
        const debouncedSaveAndUpdate = debounce(() => {
            updateTotals();
            save();
        }, CONFIG.DEBOUNCE_DELAY);
        
        if (deudasInput) {
            deudasInput.addEventListener('input', (e) => {
                State.deudas = validateNumber(e.target.value);
                debouncedSaveAndUpdate();
            });
        }
        
        if (liquidezInput) {
            liquidezInput.addEventListener('input', (e) => {
                State.liquidez = validateNumber(e.target.value);
                save();
            });
        }
        
        // Botón añadir custom
        const addCustomBtn = document.getElementById(`${WIDGET_PREFIX}-add-custom`);
        if (addCustomBtn) {
            addCustomBtn.addEventListener('click', () => {
                if(State.nns.personalizados.length < CONFIG.MAX_CUSTOM_NNS) {
                    State.nns.personalizados.push({ nombre: '', monto: 0 });
                    renderCustoms();
                } else {
                    alert(`⚠️ Máximo ${CONFIG.MAX_CUSTOM_NNS} gastos personalizados.`);
                }
            });
        }
        
        // Navegación
        const nextBtn = document.getElementById(`${WIDGET_PREFIX}-btn-next`);
        const prevBtn = document.getElementById(`${WIDGET_PREFIX}-btn-prev`);
        const restartBtn = document.getElementById(`${WIDGET_PREFIX}-btn-restart`);
        const pdfBtn = document.getElementById(`${WIDGET_PREFIX}-btn-pdf`);
        
        if (nextBtn) nextBtn.addEventListener('click', () => goToStep(State.step + 1));
        if (prevBtn) prevBtn.addEventListener('click', () => goToStep(State.step - 1));
        
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                if(confirm("¿Borrar todo y empezar de cero?")) {
                    localStorage.removeItem(STORAGE_KEY);
                    location.reload();
                }
            });
        }
        
        if (pdfBtn) pdfBtn.addEventListener('click', generatePDF);
        
        // Iniciar en el paso guardado
        goToStep(State.step);
        
        // Log de inicialización (solo en desarrollo)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`${WIDGET_PREFIX} v${VERSION} inicializado correctamente`);
        }
    }
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
