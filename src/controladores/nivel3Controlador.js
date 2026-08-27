const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn, isLoggedInn3 } = require('../lib/auth') //proteger profile
const XLSX = require('xlsx')
const passport = require('passport')
const agregaricc = require('../routes/funciones/agregaricc')
const { promisify } = require("util");

const obtenerConexion = () => {
  return new Promise((resolve, reject) => {
    pool.getConnection((error, conexion) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(conexion);
    });
  });
};

function limpiarNumero(valor) {
    if (valor === null || valor === undefined || valor === "") return 0;

    // si ya es número real
    if (typeof valor === "number") {
        return Number.isFinite(valor) ? valor : 0;
    }

    let str = valor.toString().trim();

    // limpiar símbolos
    str = str.replace(/\$/g, "").replace(/\s/g, "");

    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");

    // 🔥 CASO 1: ambos existen → decidir por el ÚLTIMO (decimal real)
    if (lastComma !== -1 && lastDot !== -1) {
        if (lastDot > lastComma) {
            // formato inglés → 70,000.50
            str = str.replace(/,/g, "");
        } else {
            // formato latino → 70.000,50
            str = str.replace(/\./g, "").replace(",", ".");
        }
    }

    // 🔥 CASO 2: solo coma
    else if (lastComma !== -1) {
        const decimales = str.length - lastComma - 1;

        if (decimales === 3) {
            // 70,000 → miles
            str = str.replace(/,/g, "");
        } else {
            // 70,50 → decimal
            str = str.replace(",", ".");
        }
    }

    // 🔥 CASO 3: solo punto
    else if (lastDot !== -1) {
        const decimales = str.length - lastDot - 1;

        if (decimales === 3) {
            // 70.000 → miles
            str = str.replace(/\./g, "");
        }
        // si no → decimal válido (70.50)
    }

    const num = Number(str);

    return Number.isFinite(num) ? num : 0;
}

function extraerCuitYNombre(texto) {

    let cuit = null;
    let razon = null;

    if (!texto) return { cuit, razon };

    // 🔥 NORMALIZAR TEXTO (CLAVE)
    texto = texto
        .toString()
        .normalize("NFKD")
        .replace(/[\u00A0]/g, " ") // espacios raros
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();

    // 🔥 BUSCAR CUIT (más flexible)
    const match = texto.match(/(\d{11})/);

    if (!match) {
        return { cuit: null, razon: null };
    }

    cuit = match[1];

    // 🔥 EXTRAER TODO LO QUE VIENE DESPUÉS DEL CUIT
    let index = texto.indexOf(cuit);
    let resto = texto.substring(index + cuit.length);

    // 🔥 LIMPIEZA FUERTE
    resto = resto
        .replace(/^\s*[\|\-:]?\s*/, "") // quita | - :
        .replace(/\s+/g, " ")
        .trim();

    // 🔥 CORTAR SI HAY OTRA COSA RARA
    // (ej: si después aparece otro código)
    const corte = resto.match(/^[A-Z0-9\s\/\.,]+/);
    if (corte) {
        razon = corte[0].trim();
    }

    // evitar basura
    if (!razon || razon.length < 3) razon = null;

    return { cuit, razon };


}


const reglas = [

  // ================= 1. CUIT (PRIORIDAD MÁXIMA)
  {
    test: () => cuit && CUIT_MAP[cuit],
    result: () => CUIT_MAP[cuit]
  },

  // ================= 2. IMPUESTOS POR TEXTO
  {
    test: () => texto.includes("RETENCION ING. BRUTOS"),
    result: () => ({
      concepto: "Impuestos- DGR",
      categoria_general: "Impuestos",
      subcategoria: "DGR"
    })
  },
  {
    test: () => texto.includes("IVA") || texto.includes("25413"),
    result: () => ({
      concepto: "Impuestos - AFIP",
      categoria_general: "Impuestos",
      subcategoria: "AFIP"
    })
  },
{
    test: () => cuit === "27217344471" && tipo_operacion === "Crédito",
    result: () => ({
        concepto: "Reintegro Impuesto de Sellos",
        categoria_general: "Ingresos",
        subcategoria: "Reintegros"
    })
},
{
    test: () => cuit === "27217344471" && tipo_operacion === "Débito",
    result: () => ({
        concepto: "Honorarios Profesionales",
        categoria_general: "Legales",
        subcategoria: "Honorarios"
    })
},
{
    test: () => cuit === "30584152474",
    result: () => ({
        concepto: "Transferencia de fondo Municipal",
        categoria_general: "Transferencias",
        subcategoria: "Municipal"
    })
},
  // ================= 3. TRANSFERENCIAS
  {
    test: () => texto.includes("TRANSFERENCIA") || texto.includes("TRF"),
    result: () => ({
      concepto: "Transferencias",
      categoria_general: "Transferencias",
      subcategoria: "Bancarias"
    })
  },

  // ================= 4. BANCARIO
  {
    test: () => texto.includes("COMISION"),
    result: () => ({
      concepto: "Gastos y Comisiones Bancarias",
      categoria_general: "Bancarios",
      subcategoria: "Comisiones"
    })
  },

  // ================= 5. SEGURIDAD
  {
    test: () => razon_social.includes("POLICIA"),
    result: () => ({
      concepto: "Servicio de Seguridad - Adicional de Policias",
      categoria_general: "Seguridad",
      subcategoria: "Policial"
    })
  },
  {
    test: () => razon_social.includes("SEGUR"),
    result: () => ({
      concepto: "Servicios de Seguridad",
      categoria_general: "Seguridad",
      subcategoria: "Privada"
    })
  },

  // ================= 6. COMBUSTIBLE
  {
    test: () => texto.includes("COMBUSTIBLE"),
    result: () => ({
      concepto: "Combustibles",
      categoria_general: "Operativos",
      subcategoria: "Combustible"
    })
  },

  // ================= 7. RODADOS
  {
    test: () => razon_social.match(/(AUTO|MOTOR|VEHIC|RODAD)/),
    result: () => ({
      concepto: "Reparación y mantenimiento Rodados",
      categoria_general: "Operativos",
      subcategoria: "Vehículos"
    })
  },

  // ================= 8. HONORARIOS (IMPORTANTE: ABAJO)
  {
    test: () =>
      cuit !== null,
    result: () => ({
      concepto: "Honorarios Profesionales",
      categoria_general: "Legales",
      subcategoria: "Honorarios"
    })
  },

  // ================= 9. INGRESOS GENERALES
  {
    test: () => tipo_operacion === "Crédito",
    result: () => ({
      concepto: "Otros Ingresos",
      categoria_general: "Ingresos",
      subcategoria: "Otros"
    })
  },

  // ================= 10. DEFAULT
  {
    test: () => true,
    result: () => ({
      concepto: "Otros Egresos",
      categoria_general: "Otros",
      subcategoria: "Otros"
    })
  }

];



// =========================
// 🔧 ANALISIS COMPLETO
// =========================
// =========================================================
// TABLA DE CLASIFICACION POR CUIT (reemplaza la regla generica
// que mandaba todo a "Honorarios Profesionales"). Definida a partir
// del relevamiento de RECATEGORIZACION Y RECONCEPTUACION.xlsx.
// Cada CUIT puede tener una clasificacion para 'debito' (egreso) y/o
// 'credito' (ingreso) distinta - si no esta definida para una direccion,
// el motor de reglas de abajo decide como antes.
// =========================================================
const CLASIFICACION_POR_CUIT = {
    // ADRIANA DELIA SOLEDAD FAR
    "27265600471": {
        debito: { concepto: "Asesoria / Consultoria", categoria_general: "Sueldos", subcategoria: "Asesoria" },
    },
    // AGOSTINA AYMARA FALCON
    "20429954860": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // AGUA NOBLE SRL
    "30714916072": {
        debito: { concepto: "Agua", categoria_general: "Otros Gastos", subcategoria: "Agua" },
    },
    // ALBORNOZ JUAN RAMON
    "20230765244": {
        debito: { concepto: "Varios", categoria_general: "Escribania", subcategoria: "Honorarios" },
    },
    // ALFREDO ADRIAN VERA
    "20229370554": {
        debito: { concepto: "Seguridad - Adicional de Policias", categoria_general: "Seguridad", subcategoria: "Policial" },
    },
    // ARCE NAHUEL ROLANDO
    "20408169152": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // ARIEL OMAR LOPEZ
    "20248659506": {
        debito: { concepto: "Seguridad - Adicional de Policias", categoria_general: "Seguridad", subcategoria: "Policial" },
    },
    // AYALA RAMONA
    "27366754658": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // BARRIENTOS BARBARA CATHERINE
    "23416278474": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // BENITEZ MATIAS EMMANUEL
    "20336834148": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // BRASCHI RUBEN DARIO
    "20229298667": {
        debito: { concepto: "Seguridad - Banos Quimicos", categoria_general: "Seguridad", subcategoria: "Banos Quimicos" },
    },
    // CAJA MUNIC DE PRESTAMOS
    "30608517290": {
        debito: { concepto: "Reintegro de sueldos y movilidad", categoria_general: "Sueldos", subcategoria: "Reintegros" },
    },
    // CARLOS EDUARDO CANDIA
    "20328022932": {
        debito: { concepto: "Mensuras", categoria_general: "Otros Gastos", subcategoria: "Mensuras" },
    },
    // CIA DE SEG LA MERCANTIL
    "30500036911": {
        debito: { concepto: "Seguros", categoria_general: "Otros Gastos", subcategoria: "Seguros" },
    },
    // CONS DE COPROPIETARIOS
    "30718348044": {
        debito: { concepto: "Expensas SC", categoria_general: "Expensas", subcategoria: "Expensas" },
    },
    // DANIEL HUGO GOMEZ
    "20270957804": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // DELGADO ADRIANA EVELIN
    "27377963119": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // EMMANUEL MATIAS NIGRO CARDENAS
    "20363177914": {
        debito: { concepto: "Serv. Luz y Agua", categoria_general: "Otros Gastos", subcategoria: "Luz y Agua" },
    },
    // ENRIQUE FERNANDO GABRIEL
    "20348251253": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // FLORES IVAN MARCELO
    "23369898019": {
        debito: { concepto: "Varios", categoria_general: "Otros Gastos", subcategoria: "Varios" },
    },
    // GALLARDO ALDANA LUJAN
    "27337293854": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // GIGARED SA
    "30663045179": {
        debito: { concepto: "Servicio de Internet", categoria_general: "Otros Gastos", subcategoria: "Internet" },
    },
    // GOMEZ MAYRA SOLEDAD
    "27302527747": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // GONZALEZ GREGORIO A
    "20334711340": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // INTEGRIA CONSULTIN
    "30718070054": {
        debito: { concepto: "Asesoria / Consultoria", categoria_general: "Sueldos", subcategoria: "Asesoria" },
    },
    // JMS SRL
    "30717502732": {
        debito: { concepto: "Extraord. Cerramiento / Legales", categoria_general: "Otros Gastos", subcategoria: "Cerramiento" },
    },
    // JUAN PABLO EDUARDO ENRIQUEZ
    "20339484547": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // LENCINA BERNARDO BENJAMIN
    "20226418130": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // LUIS ANGEL CUADRADO
    "20079145514": {
        debito: { concepto: "Insumos Informaticos", categoria_general: "Otros Gastos", subcategoria: "Informatica" },
    },
    // MATIAS JOSE MARTINEZ (compensacion: entra y sale, no es ingreso ni gasto real)
    "20317205857": {
        debito: { concepto: "No encontrado", categoria_general: "Otros", subcategoria: "Otros" },
        credito: { concepto: "No encontrado", categoria_general: "Otros", subcategoria: "Otros" },
    },
    // MF SERVICIOS INTEG
    "30718859502": {
        debito: { concepto: "Seguridad - Empresa de Seguridad", categoria_general: "Seguridad", subcategoria: "Empresa de Seguridad" },
    },
    // MILANO RICARDO MAXIMO
    "20200852193": {
        debito: { concepto: "Libreria", categoria_general: "Otros Gastos", subcategoria: "Libreria" },
    },
    // MINO RAFAEL ANTONIO
    "20327327780": {
        debito: { concepto: "Mensuras", categoria_general: "Otros Gastos", subcategoria: "Mensuras" },
    },
    // MIRIAN LUCIA GONZALEZ (el credito es una compensacion: cash-out recibido y devuelto)
    "27354373047": {
        debito: { concepto: "Serv. Luz y Agua", categoria_general: "Otros Gastos", subcategoria: "Luz y Agua" },
        credito: { concepto: "No encontrado", categoria_general: "Otros", subcategoria: "Otros" },
    },
    // MOREL DAVID EZEQUIEL
    "20364688882": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // MUNIZ MARIA JOSE
    "27420680924": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // PABLO DARIO DANIEL REVIDA
    "20182958620": {
        debito: { concepto: "Alquiler de casa", categoria_general: "Otros Gastos", subcategoria: "Alquiler" },
    },
    // PENAYO SANDRA ISABEL
    "27201836803": {
        debito: { concepto: "Varios", categoria_general: "Escribania", subcategoria: "Honorarios" },
    },
    // PIXEL INFORMATICA S R L
    "30708931949": {
        debito: { concepto: "Insumos Informaticos", categoria_general: "Otros Gastos", subcategoria: "Informatica" },
    },
    // RAMIREZ CASTANEDA F
    "20338551348": {
        debito: { concepto: "Gastos Judiciales", categoria_general: "Otros Gastos", subcategoria: "Judiciales" },
    },
    // RAMIREZ OSCAR RAMIRO
    "20233474771": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // SANCOR COOPERATIVA DE SEGUROS
    "30500049460": {
        debito: { concepto: "Seguros", categoria_general: "Otros Gastos", subcategoria: "Seguros" },
    },
    // SEGOVIA JOSE RAMON
    "20223213422": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // SERVICIOS Y SISTEMAS SRL
    "30708592370": {
        debito: { concepto: "Serv. Tecnico de PC", categoria_general: "Otros Gastos", subcategoria: "Tecnico PC" },
    },
    // SILVA MARIA BELEN
    "27327292272": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // SILVERO MACHUCA JUAN FRANCISCO
    "20325516403": {
        debito: { concepto: "Honorarios Profesionales", categoria_general: "Sueldos", subcategoria: "Honorarios" },
    },
    // SINOPOLIS MAXIMILIANO JAVIER
    "23249084239": {
        debito: { concepto: "Serv. Tecnico de PC", categoria_general: "Otros Gastos", subcategoria: "Tecnico PC" },
    },
    // SUPERLIM SAS
    "30716771578": {
        debito: { concepto: "Serv. de Limpieza", categoria_general: "Otros Gastos", subcategoria: "Limpieza" },
        credito: { concepto: "Cobranzas SC - Parque Industrial", categoria_general: "Cobranzas", subcategoria: "Cobranzas", proyecto: "PIT" },
    },
    // EJECUCION PRESUPUESTARIA (ingreso: fondo municipal)
    "30584152474": {
        credito: { concepto: "Fondo Municipal", categoria_general: "Otros", subcategoria: "Fondo Municipal" },
    },
    // BOTELLO PAULA (ingreso: reintegro de sellos, misma logica que Ward)
    "27316865211": {
        credito: { concepto: "Reintegro de Sellos", categoria_general: "Escribania", subcategoria: "Reintegro" },
    },
    // Adolfo Raul Gonzalez (ingreso: cobranza Parque Industrial)
    "20144597525": {
        credito: { concepto: "Cobranzas SC - Parque Industrial", categoria_general: "Cobranzas", subcategoria: "Cobranzas", proyecto: "PIT" },
    },
    // ARENGO MAMBRIN SRL (ingreso: cobranza Parque Industrial)
    "30716001608": {
        credito: { concepto: "Cobranzas SC - Parque Industrial", categoria_general: "Cobranzas", subcategoria: "Cobranzas", proyecto: "PIT" },
    },
    // Walter Luis Bizarro (ingreso: cobranza Parque Industrial)
    "20261084768": {
        credito: { concepto: "Cobranzas SC - Parque Industrial", categoria_general: "Cobranzas", subcategoria: "Cobranzas", proyecto: "PIT" },
    },
    // TRI SOLE SA
    "30714664928": {
        debito: { concepto: "Combustible", categoria_general: "Otros Gastos", subcategoria: "Combustible" },
    },
    // WARD MARIA VICTORIA
    "27217344471": {
        debito: { concepto: "Varios", categoria_general: "Escribania", subcategoria: "Honorarios" },
        credito: { concepto: "Reintegro de Sellos", categoria_general: "Escribania", subcategoria: "Reintegro" },
    },
    // ZALAZAR ZONE JOSUE
    "20439305658": {
        debito: { concepto: "Asesoria / Consultoria", categoria_general: "Sueldos", subcategoria: "Asesoria" },
    },
};

// true si ya existe una clasificacion propia (por CUIT) para esta direccion -
// se usa para que la logica de cobranzas/"No encontrado" de mas abajo no
// pise una clasificacion ya resuelta explicitamente.
function tieneClasificacionPropia(cuit, direccion) {
    return Boolean(cuit && CLASIFICACION_POR_CUIT[cuit] && CLASIFICACION_POR_CUIT[cuit][direccion]);
}

function analizarDescripcion(texto, debito = 0, credito = 0) {

    let cuit = null;
    let razon_social = null;
    let concepto = "Otros";
    let tipo_operacion = null;

    let categoria_general = "Otros";
    let subcategoria = "Otros";
    let proyecto = "General";
    let tipo_gasto = null;

    if (!texto) {
        return { cuit, razon_social, concepto, tipo_operacion, categoria_general, subcategoria, proyecto, tipo_gasto };
    }

    texto = texto.toUpperCase();

    // =========================
    // CUIT + NOMBRE
    // =========================
    const datos = extraerCuitYNombre(texto);
    cuit = datos.cuit;
    razon_social = datos.razon || "";

    // =========================
    // TIPO OPERACION
    // =========================
// 🔥 REGLA FUERTE (PRIORIDAD TOTAL)
if (credito > 0 && debito === 0) {
    tipo_operacion = "Crédito";
} else if (debito > 0 && credito === 0) {
    tipo_operacion = "Débito";
} else if (credito > 0 && debito > 0) {
    // caso raro (error de datos)
    tipo_operacion = credito >= debito ? "Crédito" : "Débito";
} else {
    tipo_operacion = null;
}

    // =========================
    // TABLA POR CUIT (prioridad maxima, antes que cualquier regla generica)
    // =========================
    if (cuit && tipo_operacion) {
        const direccion = tipo_operacion === "Crédito" ? "credito" : "debito";
        const propia = CLASIFICACION_POR_CUIT[cuit] && CLASIFICACION_POR_CUIT[cuit][direccion];

        if (propia) {
            return {
                cuit,
                razon_social,
                concepto: propia.concepto,
                tipo_operacion,
                categoria_general: propia.categoria_general,
                subcategoria: propia.subcategoria,
                proyecto: propia.proyecto || proyecto,
                tipo_gasto: tipo_operacion === "Débito" ? "Variable" : null,
            };
        }
    }

    // =========================
    // PROYECTO
    // =========================
    if (texto.includes("IC3")) proyecto = "IC3";
    else if (texto.includes("IC4")) proyecto = "IC4";
    else if (texto.includes("IB5")) proyecto = "IB5";
    else if (texto.includes("PARQUE")) proyecto = "Parque Industrial";

    // =========================================================
    // 🧠 MOTOR DE REGLAS (ORDEN IMPORTA)
    // =========================================================

    const reglas = [
        {
    test: () =>
        texto.includes("RETENCION") &&
        texto.includes("ING") &&
        texto.includes("BRUTOS"),
    result: () => ({
        concepto: "Impuestos- DGR",
        categoria_general: "Impuestos",
        subcategoria: "DGR"
    })
},

// 🔴 LEY 25413 (IMPUESTO AL CHEQUE / AFIP)
{
    test: () =>
        texto.includes("25413") ||
        texto.includes("IMP.LEY 25413"),
    result: () => ({
        concepto: "Impuestos - AFIP",
        categoria_general: "Impuestos",
        subcategoria: "AFIP"
    })
},
// 🔥 CUITS ESPECÍFICOS (PRIORIDAD MÁXIMA)
{
    test: () => cuit === "20319698656",
    result: () => ({
        concepto: "Seguridad - Empresa de Seguridad",
        categoria_general: "Seguridad",
        subcategoria: "Empresa de Seguridad"
    })
},
// Nota: 30608517290, 23249084239, 20182958620, 30718348044 y 30714664928 ya no
// tienen regla aca - los resuelve CLASIFICACION_POR_CUIT (mas arriba) con la
// categoria/concepto ya corregidos, asi que esta parte del array nunca los
// llega a evaluar.
{
    test: () => cuit === "30669726712",
    result: () => ({
        concepto: "Seguridad - Adicional de Policias",
        categoria_general: "Seguridad",
        subcategoria: "Policial"
    })
},
{
    test: () => cuit === "30709110078",
    result: () => ({
        concepto: "Impuestos- DGR",
        categoria_general: "Impuestos",
        subcategoria: "DGR"
    })
},
{
    test: () => cuit === "33693450239",
    result: () => ({
        concepto: "Impuestos - AFIP",
        categoria_general: "Impuestos",
        subcategoria: "AFIP"
    })
},

        // ================= CREDITOS =================
        // (la regla generica "cualquier CUIT reconocido -> Honorarios Profesionales"
        // se elimino: era la causa de que casi todo terminara en ese concepto.
        // Ahora, si el CUIT no esta en CLASIFICACION_POR_CUIT, se sigue evaluando
        // el resto de las reglas de abajo segun el texto de la descripcion.)
        {
            test: () => tipo_operacion === "Crédito" && texto.includes("REMESA"),
            result: () => ({
                concepto: "Ingresos PIT/IC3",
                categoria_general: "Cheques",
                subcategoria: "Remesas"
            })
        },

        {
            test: () => tipo_operacion === "Crédito" && texto.includes("TRANSFERENCIA"),
            result: () => ({
                concepto: "Transferencia de fondos",
                categoria_general: "Transferencias",
                subcategoria: "Transferencias"
            })
        },

        {
            test: () => tipo_operacion === "Crédito",
            result: () => ({
                concepto: "Otros Ingresos",
                categoria_general: "Otros",
                subcategoria: "Otros"
            })
        },

        // ================= IMPUESTOS =================
        {
            test: () => texto.includes("RETENCION ING. BRUTOS"),
            result: () => ({
                concepto: "Impuestos- DGR",
                categoria_general: "Impuestos",
                subcategoria: "DGR"
            })
        },

        {
            test: () => texto.includes("25413") || texto.includes("IVA"),
            result: () => ({
                concepto: "Impuestos - AFIP",
                categoria_general: "Impuestos",
                subcategoria: "AFIP"
            })
        },

        // ================= BANCARIO =================
        {
            test: () => texto.includes("COMISION"),
            result: () => ({
                concepto: "Gastos y Comisiones Bancarias",
                categoria_general: "Bancarios",
                subcategoria: "Comisiones"
            })
        },

        // ================= TRANSFERENCIAS =================
        {
            test: () => texto.includes("TRF") || texto.includes("TRANSFERENCIA"),
            result: () => ({
                concepto: "Transferencias",
                categoria_general: "Transferencias",
                subcategoria: "Bancarias"
            })
        },

        // ================= HONORARIOS (🔥 NUEVO) =================
        {
            test: () =>
                razon_social.match(/(ABOG|ESTUDIO|CONTADOR|ASESOR|CONSULT|ARQ|ING)/),
            result: () => ({
                concepto: "Honorarios Profesionales",
                categoria_general: "Legales",
                subcategoria: "Honorarios"
            })
        },

        // ================= SEGURIDAD =================
        {
            test: () => razon_social.includes("POLICIA"),
            result: () => ({
                concepto: "Servicio de Seguridad - Adicional de Policias",
                categoria_general: "Seguridad",
                subcategoria: "Policial"
            })
        },

        {
            test: () => razon_social.includes("SEGUR"),
            result: () => ({
                concepto: "Servicios de Seguridad",
                categoria_general: "Seguridad",
                subcategoria: "Privada"
            })
        },

        // ================= COMBUSTIBLE =================
        {
            test: () => texto.includes("COMBUSTIBLE"),
            result: () => ({
                concepto: "Combustibles",
                categoria_general: "Operativos",
                subcategoria: "Combustible"
            })
        },

        // ================= RODADOS =================
        {
            test: () => razon_social.match(/(AUTO|MOTOR|VEHIC|RODAD)/),
            result: () => ({
                concepto: "Reparación y mantenimiento Rodados",
                categoria_general: "Operativos",
                subcategoria: "Vehículos"
            })
        },

        // ================= DEFAULT =================
        {
            test: () => true,
            result: () => ({
                concepto: "Otros Egresos",
                categoria_general: "Otros",
                subcategoria: "Otros"
            })
        }
    ];

    // =========================
    // EJECUTAR REGLAS
    // =========================
    for (const regla of reglas) {
        if (regla.test()) {
            const res = regla.result();

            concepto = res.concepto;
            categoria_general = res.categoria_general;
            subcategoria = res.subcategoria;
            tipo_gasto = tipo_operacion === "Débito" ? "Variable" : null;

            break;
        }
    }
if (subcategoria === "DGR") {
    cuit = "30709110078";
    razon_social="DGR"
}

if (subcategoria === "AFIP") {
    cuit = "33693450239";
    razon_social="ARCA"
}
    return {
        cuit,
        razon_social,
        concepto,
        tipo_operacion,
        categoria_general,
        subcategoria,
        proyecto,
        tipo_gasto
    };
}

function parseFecha(fecha) {
    if (!fecha) return null;

    fecha = String(fecha).trim();

    // 📌 Excel número (string o number)
    if (!isNaN(fecha)) {
        const num = Number(fecha);

        if (num > 20000) { // validación básica
            const fechaJS = new Date((num - 25569) * 86400 * 1000);

            const anio = fechaJS.getUTCFullYear();
            const mes = String(fechaJS.getUTCMonth() + 1).padStart(2, "0");
            const dia = String(fechaJS.getUTCDate()).padStart(2, "0");

            return `${anio}-${mes}-${dia}`;
        }
    }

    // 📌 DD/MM/YYYY (formato argentino real de los extractos bancarios,
    // ej. "8/6/2026" es el 8 de junio, no el 6 de agosto)
if (fecha.includes("/")) {
    const partes = fecha.split("/");

    if (partes.length === 3) {
        let [dia, mes, anio] = partes;

        if (anio.length === 2) {
            anio = "20" + anio;
        }

        return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
    }
}

    return null;
}




function obtenerFechaArgentina() {
    const ahora = new Date();

    // ajustar a UTC-3 manual
    const offsetMs = -3 * 60 * 60 * 1000;
    const fechaArg = new Date(ahora.getTime() + offsetMs);

    const anio = fechaArg.getUTCFullYear();
    const mes = String(fechaArg.getUTCMonth() + 1).padStart(2, "0");
    const dia = String(fechaArg.getUTCDate()).padStart(2, "0");

    const horas = String(fechaArg.getUTCHours()).padStart(2, "0");
    const minutos = String(fechaArg.getUTCMinutes()).padStart(2, "0");
    const segundos = String(fechaArg.getUTCSeconds()).padStart(2, "0");

    return `${anio}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
}


const subirexceldemovimientos = async (req, res) => {
    let cacheClientes = {};

    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se envió archivo" });
        }

        // raw:true evita que XLSX auto-detecte fechas como si fueran celdas de
        // Excel y las reformatee sola (para textos ambiguos tipo "2/02/2026"
        // esto generaba un serial de fecha corrupto -1 día/mes). Con raw:true
        // cada celda llega como el texto literal del archivo, sin adivinar tipos.
        const workbook = XLSX.read(req.file.buffer, { type: "buffer", raw: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false
        });

        let insertados = 0;
        let duplicados = 0;
        let duplicadosDetalle = [];

        const clavesExcel = new Set();
        const clavesBD = new Set();

        // =========================================================
        // 🔥 1. TRAER EXISTENTES DE BD
        // =========================================================

        const rowsExistentes = await pool.query(`
            SELECT 
                fecha,
                REGEXP_REPLACE(cuil_cuit, '[^0-9]', '') as cuit,
                   saldo,
                CASE 
                    WHEN debito > 0 THEN debito
                    ELSE credito
                END as monto
            FROM movimientos
        `);

for (const row of rowsExistentes) {
  const clave = `${row.fecha}_${row.cuit}_${Number(row.monto || 0)}_${Number(row.saldo || 0)}`;
    clavesBD.add(clave);
}

        // =========================================================
        // 🔥 2. PRE-CARGAR CUITS
        // =========================================================

        const cuitSet = new Set();

        for (const fila of data) {
            const descripcion = fila["DESCRIPCION"] || "";
            if (!descripcion) continue;

            const debito = limpiarNumero(fila["DEBITO EN $"]);
            const credito = limpiarNumero(fila["CREDITO EN $"]);
    const saldo = limpiarNumero(fila["SALDO EN $"]);
            if (debito === 0 && credito === 0) continue;

            const analisis = analizarDescripcion(descripcion, debito, credito);

            if (analisis.cuit) {
                cuitSet.add(analisis.cuit);
            }
        }

        const cuitArray = Array.from(cuitSet);

        if (cuitArray.length > 0) {
            const placeholders = cuitArray.map(() => "?").join(",");

            const rows = await pool.query(
                `SELECT REGEXP_REPLACE(cuil_cuit, '[^0-9]', '') as cuit, zona
                 FROM clientes
                 WHERE REGEXP_REPLACE(cuil_cuit, '[^0-9]', '') IN (${placeholders})`,
                cuitArray
            );

            for (const row of rows) {
                const cuit = row.cuit;
                const zona = (row.zona || "").toUpperCase();

                if (!cacheClientes[cuit]) {
                    cacheClientes[cuit] = [];
                }

                cacheClientes[cuit].push(zona);
            }
        }

        // =========================================================
        // 🔥 3. PROCESAR FILAS
        // =========================================================

        for (const fila of data) {

            const descripcion = fila["DESCRIPCION"] || "";
            if (!descripcion || descripcion.toLowerCase().trim() === "ver") continue;

            const fechaRaw = String(fila["FECHA"] || "");
            const debito = limpiarNumero(fila["DEBITO EN $"]);
            
            const credito = limpiarNumero(fila["CREDITO EN $"]);
            const saldo = limpiarNumero(fila["SALDO EN $"]);

            const fecha = parseFecha(fechaRaw);
            if (!fecha) continue;
            if (debito === 0 && credito === 0) continue;

            const fechaCarga = obtenerFechaArgentina();

            const analisis = analizarDescripcion(descripcion, debito, credito);

            const monto = debito > 0 ? debito : credito;
       const clave = `${fecha}_${analisis.cuit}_${monto}_${saldo}`;

            // 🔴 DUPLICADO EN EXCEL
            if (clavesExcel.has(clave)) {
                duplicados++;

                duplicadosDetalle.push({
                    tipo: "EXCEL",
                    fecha,
                    cuit: analisis.cuit,
                    monto,
                       saldo,
                    descripcion
                });

                continue;
            }

            clavesExcel.add(clave);

            // 🔴 DUPLICADO EN BD
            if (clavesBD.has(clave)) {
                duplicados++;

                duplicadosDetalle.push({
                    tipo: "BD",
                    fecha,
                    cuit: analisis.cuit,
                    monto,
                        saldo,
                    descripcion,
                    
                });

                continue;
            }

            // =========================================================
            // 🔥 LOGICA DE COBRANZAS
            // =========================================================

            if (
                analisis.cuit &&
                analisis.tipo_operacion === "Crédito" &&
                !tieneClasificacionPropia(analisis.cuit, "credito")
            ) {

                const zonas = cacheClientes[analisis.cuit];

                if (!zonas) {
                    analisis.concepto = "No encontrado";
                    analisis.categoria_general = "Otros";
                    analisis.subcategoria = "Otros";
                } else {

                    const tieneIC3 = zonas.some(z =>
                        z.includes("CORRIENTES") || z.includes("IC3")
                    );

                    const tienePIT = zonas.some(z =>
                        z.includes("PIT")
                    );

                    if (tienePIT) {
                        analisis.concepto = "Cobranzas SC - Parque Industrial";
                        analisis.categoria_general = "Cobranzas";
                        analisis.subcategoria = "Cobranzas";
                        analisis.proyecto = "PIT";

                    } else if (tieneIC3) {
                        analisis.concepto = "Cobranzas SC - Fracción IC3";
                        analisis.categoria_general = "Cobranzas";
                        analisis.subcategoria = "Cobranzas";
                        analisis.proyecto = "IC3";

                    } else {
                        analisis.concepto = "No encontrado";
                        analisis.categoria_general = "Otros";
                        analisis.subcategoria = "Otros";
                    }
                }
            }

            // =========================================================
            // 🔥 INSERT
            // =========================================================

           await pool.query(
    `INSERT INTO movimientos
    (fecha, fechacarga, debito, credito, saldo, descripcion, cuil_cuit, nombre_razon, concepto, tipo_operacion, categoria_general, subcategoria, proyecto, tipo_gasto)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
        fecha,
        fechaCarga,
        debito,
        credito,
        saldo,
        descripcion,
        analisis.cuit,
        analisis.razon_social,
        analisis.concepto,
        analisis.tipo_operacion,
        analisis.categoria_general,
        analisis.subcategoria,
        analisis.proyecto,
        analisis.tipo_gasto
    ]
);

            insertados++;
        }

        // =========================================================
        // 🔥 LOG DUPLICADOS
        // =========================================================

        console.log("======== DUPLICADOS DETECTADOS ========");
        console.log(`Total duplicados: ${duplicados}`);
        console.table(duplicadosDetalle);

        cacheClientes = null;

        res.json({
            mensaje: "Importación finalizada",
            total: data.length,
            insertados,
            duplicados,
            duplicados_detalle: duplicadosDetalle
        });

    } catch (error) {
        console.error(error);
        cacheClientes = null;

        res.status(500).json({ error: "Error procesando Excel" });
    }
};


const mofificarmconcepto = async (req, res) => {
    try {
        const { id, concepto } = req.body;
        console.log(id, concepto)
        // 🔴 Validaciones básicas
        if (!id) {
            return res.status(400).json({ error: "Falta el ID" });
        }

        if (!concepto) {
            return res.status(400).json({ error: "Falta el concepto" });
        }

        // 🔍 Verificar que exista
        const existe = await pool.query(
            "SELECT id FROM movimientos WHERE id = ? LIMIT 1",
            [id]
        );

        if (existe.length === 0) {
            return res.status(404).json({ error: "Movimiento no encontrado" });
        }

        // 💾 Update
        await pool.query(
            "UPDATE movimientos SET concepto = ? WHERE id = ?",
            [concepto, id]
        );

        res.json({
            ok: true,
            mensaje: "Concepto actualizado correctamente"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al actualizar concepto"
        });
    }
};

const traeringresos = async (req, res) => {

  try {

    const historial = await pool.query(`
      SELECT *
      FROM movimientos
      WHERE tipo_operacion = "Crédito"
      ORDER BY fecha DESC
    `);

    // =====================================================
    // PRINCIPALES INGRESOS
    // =====================================================

    const conceptosMap = {};

    historial.forEach((mov) => {

      const concepto =
        mov.concepto || "Sin concepto";

      const monto =
        Number(mov.credito) || 0;

      if (!conceptosMap[concepto]) {

        conceptosMap[concepto] = 0;

      }

      conceptosMap[concepto] += monto;

    });

    const principalesIngresos =
      Object.entries(conceptosMap)
        .map(([concepto, monto]) => ({
          concepto,
          monto
        }))
        .sort((a, b) => b.monto - a.monto)
        .slice(0, 10);

    // =====================================================
    // INGRESOS POR MES
    // =====================================================

    const ingresosPorMesMap = {};

    historial.forEach((mov) => {

      const fecha =
        new Date(mov.fecha);

      const mes =
        String(fecha.getMonth() + 1)
          .padStart(2, "0");

      const anio =
        fecha.getFullYear();

      const key =
        `${mes}-${anio}`;

      if (!ingresosPorMesMap[key]) {

        ingresosPorMesMap[key] = 0;

      }

      ingresosPorMesMap[key] +=
        Number(mov.credito) || 0;

    });

    const ingresosPorMes =
      Object.entries(ingresosPorMesMap)
        .map(([mes, total]) => ({
          mes,
          total
        }))
        .sort((a, b) => {

          const [mesA, anioA] =
            a.mes.split("-");

          const [mesB, anioB] =
            b.mes.split("-");

          return (
            new Date(`${anioA}-${mesA}-01`) -
            new Date(`${anioB}-${mesB}-01`)
          );

        });

    // =====================================================
    // INGRESOS POR DIA
    // =====================================================

    const ingresosPorDiaMap = {};

    historial.forEach((mov) => {

      const fecha = mov.fecha;

      if (!ingresosPorDiaMap[fecha]) {

        ingresosPorDiaMap[fecha] = 0;

      }

      ingresosPorDiaMap[fecha] +=
        Number(mov.credito) || 0;

    });

    const ingresosPorDia =
      Object.entries(ingresosPorDiaMap)
        .map(([fecha, total]) => ({
          fecha,
          total
        }))
        .sort(
          (a, b) =>
            new Date(a.fecha) -
            new Date(b.fecha)
        );

    // =====================================================
    // TOTAL GENERAL
    // =====================================================

    const totalIngresos =
      historial.reduce((acc, mov) => {

        return (
          acc +
          (Number(mov.credito) || 0)
        );

      }, 0);

    // =====================================================
    // RESPONSE
    // =====================================================

    res.json({

      totalIngresos,

      principalesIngresos,

      ingresosPorMes,

      ingresosPorDia,

      movimientos: historial

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Error al obtener ingresos"
    });

  }

};

const historialIcc = async (req, res) => {

    const historial = await pool.query('select * from icc_historial')

    res.json(historial)

}

const pagoSi = async (req, res) => {

    const historial = await pool.query('select * from historial_pagosi')

    res.json(historial)

}

const borrarHistorial = async (req, res) => {

    try {
        await pool.query('DELETE FROM icc_historial ')
        res.send('Borrados correctamente')
    } catch (error) {
        //  console.log(error)
        res.send('Error algo sucedió')
    }

}

const asignarClave = async (req, res) => {
    const { cuil_cuit, clave_alta } = req.body;
    try {


        const aux = '%' + cuil_cuit + '%'
        const existe = await pool.query('select * from clientes WHERE cuil_cuit like  ?', [aux])
        if (existe.length > 0) {
            const asignar = {
                clave_alta: clave_alta
            }
            await pool.query('UPDATE clientes set ? WHERE cuil_cuit like  ?', [asignar, aux])
            res.send('Clave asignada')
        } else {
            res.send('Error cliente no existe')
        }




    } catch (error) {

        res.send('Error algo sucedió')
    }

}

const asignarvalormetroc = async (req, res) => {
    const { valor, zona } = req.body;
    try {

        fecha = (new Date(Date.now())).toLocaleDateString()

        val = {
            valormetrocuadrado: valor,
            valormetroparque: zona,
            fecha
        }


        await pool.query('insert into nivel3 set ?', val)
        res.send('Borrados correctamente')

    } catch (error) {
        // console.log(error)
        res.send('Error algo sucedió')
    }

}

const consultarIcc = async (req, res,) => {
    let { ICC, mes, anio, zona } = req.body;
    let rta = {}
    try {
        const existe = await pool.query('select * from icc_historial where mes=? and anio=? and zona =?', [mes, anio, zona])
        if (existe.length > 0) {

            const valor = existe[0]['ICC']

            rta = {
                resp: 'El mes y año ya tiene un ICC asignado y es ' + valor

            }
        } else {

            rta = {
                resp: 'El mes y año no tienen un ICC asignado'

            }


        }

        res.json(rta)
    } catch (error) {

    }


}

const agregarIccgral = async (req, res,) => {
    let { ICC, mes, anio, zona } = req.body;

    let datoss = {
        ICC,
        mes,
        anio,
        zona

    }

    //////////////try


    try {

        exis = await pool.query("select * from icc_historial where mes =? and anio =? and zona=?", [mes, anio, zona])
        if (exis.length > 0) {
            await pool.query('UPDATE icc_historial set ? WHERE id = ?', [datoss, exis[0]["id"]])
        } else {

            await pool.query('insert into icc_historial set?', datoss)
        }
    } catch (error) {
        // console.log(error)
    }



    const todas = await pool.query("select * from cuotas where mes =? and anio =? and zona =?", [mes, anio, zona])

    for (var i = 0; i < todas.length; i++) {

        await agregaricc.calcularicc(todas[i], ICC)
    }

    res.send('Icc asignado con éxito');
}

const convertirConexionAPromesas = (conexion) => {
  conexion.query = promisify(conexion.query).bind(conexion);
  conexion.beginTransaction = promisify(conexion.beginTransaction).bind(conexion);
  conexion.commit = promisify(conexion.commit).bind(conexion);
  conexion.rollback = promisify(conexion.rollback).bind(conexion);

  return conexion;
};
const convertirNumeroUSD = (valor) => {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  // Si Excel ya lo leyó como número
  if (typeof valor === "number") {
    return valor;
  }

  let texto = String(valor)
    .replace(/USD/gi, "")
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .trim();

  /*
    Casos:
    $14,500.00  -> 14500.00
    USD 845,83  -> 845.83
    USD 14.500  -> 14500
    USD 0,00    -> 0
  */

  const tieneComa = texto.includes(",");
  const tienePunto = texto.includes(".");

  if (tieneComa && tienePunto) {
    // Si la coma está después del punto: 14.500,00
    if (texto.lastIndexOf(",") > texto.lastIndexOf(".")) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else {
      // 14,500.00
      texto = texto.replace(/,/g, "");
    }
  } else if (tieneComa) {
    // 845,83
    texto = texto.replace(",", ".");
  } else if (tienePunto) {
    /*
      USD 14.500 normalmente es miles, no decimal.
      Si termina con exactamente 3 dígitos, se toma como miles.
    */
    if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
      texto = texto.replace(/\./g, "");
    }
  }

  const numero = Number(texto);

  return Number.isNaN(numero) ? null : numero;
};

const convertirFechaExcel = (fecha) => {
  if (!fecha) return null;

  // Si ya llega como Date desde SheetJS
  if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anio = fecha.getFullYear();

    return `${dia}/${mes}/${anio}`;
  }

  const texto = String(fecha).trim();

  // Si llega ya como DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    return texto;
  }

  // Si llega como YYYY-MM-DD o YYYY-MM-DDTHH...
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    const [anio, mes, dia] = texto.substring(0, 10).split("-");
    return `${dia}/${mes}/${anio}`;
  }

  return texto;
};

const limpiarManzanaOLote = (valor) => {
  if (!valor) return null;

  // Mza N°7 => 7
  // Parc N°6 => 6
  return String(valor)
    .replace(/Mza\s*N°?/gi, "")
    .replace(/Parc\s*N°?/gi, "")
    .trim();
};



// -------------------------------------------------------
const limpiarNumeroVentas = (valor) => {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  if (typeof valor === "number") {
    return valor;
  }

  let texto = String(valor)
    .replace(/USD/gi, "")
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .trim();

  if (!texto) return null;

  const tieneComa = texto.includes(",");
  const tienePunto = texto.includes(".");

  if (tieneComa && tienePunto) {
    // 18,214.00
    if (texto.lastIndexOf(".") > texto.lastIndexOf(",")) {
      texto = texto.replace(/,/g, "");
    }
    // 1.200,00
    else {
      texto = texto.replace(/\./g, "").replace(",", ".");
    }
  } else if (tieneComa) {
    // 845,83
    texto = texto.replace(",", ".");
  } else if (tienePunto) {
    /*
      18.214 normalmente es miles.
      482.1 o 37.78 son decimales.
    */
    if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
      texto = texto.replace(/\./g, "");
    }
  }

  const numero = Number(texto);

  return Number.isNaN(numero) ? null : numero;
};

// -------------------------------------------------------
// Mza N°4 => 4
// Parc N°7 => 7
// Si ya viene 4 o 7, queda igual.
// -------------------------------------------------------
const limpiarManzanaLote = (valor) => {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  return String(valor)
    .replace(/Mza\s*N[°ºo]?/gi, "")
    .replace(/Parc\s*N[°ºo]?/gi, "")
    .replace(/Manzana/gi, "")
    .replace(/Lote/gi, "")
    .trim();
};

// -------------------------------------------------------
// Devuelve DD/MM/YYYY
// -------------------------------------------------------
const convertirFechaVentas = (valor) => {
  if (!valor) return null;

  // Fecha JS
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const dia = String(valor.getDate()).padStart(2, "0");
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const anio = valor.getFullYear();

    return `${dia}/${mes}/${anio}`;
  }

  const texto = String(valor).trim();

  // Ya está bien: 01/10/2024
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    return texto;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    const [anio, mes, dia] = texto.substring(0, 10).split("-");
    return `${dia}/${mes}/${anio}`;
  }

  return texto;
};

// Busca una clave aunque Excel tenga salto de línea, espacios o comillas.
const obtenerValorColumna = (fila, nombreBuscado) => {
  const normalizar = (texto) =>
    String(texto || "")
      .replace(/\n/g, " ")
      .replace(/\r/g, " ")
      .replace(/\s+/g, " ")
      .replace(/"/g, "")
      .trim()
      .toLowerCase();

  const buscado = normalizar(nombreBuscado);

  const claveEncontrada = Object.keys(fila).find(
    (clave) => normalizar(clave) === buscado
  );

  return claveEncontrada ? fila[claveEncontrada] : "";
};

const subirexceldemovimientos2 = async (req, res) => {
  let conexion;

  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No se envió archivo Excel",
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: true,
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    /*
      header: 1 permite leer todas las filas como arrays.
      Así buscamos la fila que contiene "Manzana",
      aunque antes haya filas vacías, títulos o logos.
    */
    const filasCrudas = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
      dateNF: "dd/mm/yyyy",
    });

    const indiceEncabezado = filasCrudas.findIndex((fila) => {
      return fila.some((celda) =>
        String(celda || "").trim().toLowerCase() === "manzana"
      );
    });

    if (indiceEncabezado === -1) {
      return res.status(400).json({
        error:
          "No se encontró la columna 'Manzana'. Verifique el formato del Excel.",
      });
    }

    /*
      Convertimos desde la fila de encabezados.
      range empieza desde el índice donde está Manzana.
    */
    const data = XLSX.utils.sheet_to_json(sheet, {
      range: indiceEncabezado,
      defval: "",
      raw: false,
      dateNF: "dd/mm/yyyy",
    });

    // -------------------------------------------------------
    // Traer registros existentes para no duplicar
    // -------------------------------------------------------
    const existentes = await pool.query(`
      SELECT manzana, lote, fecha, comprador
      FROM movimientos2
    `);

    const clavesBD = new Set();

    for (const fila of existentes) {
      const clave = [
        String(fila.manzana || "").trim().toLowerCase(),
        String(fila.lote || "").trim().toLowerCase(),
        String(fila.fecha || "").trim(),
        String(fila.comprador || "").trim().toLowerCase(),
      ].join("|");

      clavesBD.add(clave);
    }

    const clavesExcel = new Set();

    let insertados = 0;
    let duplicados = 0;
    let omitidos = 0;
    const duplicadosDetalle = [];


    for (const fila of data) {
      const manzanaOriginal = obtenerValorColumna(fila, "Manzana");
      const loteOriginal = obtenerValorColumna(fila, "Lote");

      /*
        Omite:
        - filas vacías entre quincenas
        - títulos repetidos
        - subtítulos
        - filas sin manzana o lote
      */
      if (!manzanaOriginal || !loteOriginal) {
        omitidos++;
        continue;
      }

      if (
        String(manzanaOriginal).trim().toLowerCase() === "manzana" ||
        String(loteOriginal).trim().toLowerCase() === "lote"
      ) {
        omitidos++;
        continue;
      }

      const manzana = limpiarManzanaLote(manzanaOriginal);
      const lote = limpiarManzanaLote(loteOriginal);

      const fecha = convertirFechaVentas(
        obtenerValorColumna(fila, "Fecha Venta")
      );

      const comprador = obtenerValorColumna(fila, "Comprador");

      // Si es una fila separadora de quincena, no entra.
      if (!manzana || !lote || !fecha) {
        omitidos++;
        continue;
      }

      const clave = [
        String(manzana).trim().toLowerCase(),
        String(lote).trim().toLowerCase(),
        String(fecha).trim(),
        String(comprador || "").trim().toLowerCase(),
      ].join("|");

      // Duplicado dentro del mismo Excel
      if (clavesExcel.has(clave)) {
        duplicados++;

        duplicadosDetalle.push({
          tipo: "EXCEL",
          manzana,
          lote,
          fecha,
          comprador,
        });

        continue;
      }

      clavesExcel.add(clave);

      // Duplicado ya existente en la BD
      if (clavesBD.has(clave)) {
        duplicados++;

        duplicadosDetalle.push({
          tipo: "BASE_DE_DATOS",
          manzana,
          lote,
          fecha,
          comprador,
        });

        continue;
      }

      const datos = {
        manzana,
        lote,
        tipo: obtenerValorColumna(fila, "Tipo") || null,
        fecha,
        mes_venta:
          convertirFechaVentas(
            obtenerValorColumna(fila, "Mes de Venta")
          ) || null,

        comprador: comprador || null,

        valor: limpiarNumeroVentas(
          obtenerValorColumna(fila, "Valor Total (USD)")
        ),

        anticipo: limpiarNumeroVentas(
          obtenerValorColumna(fila, "Anticipo (USD)")
        ),

        m2: limpiarNumeroVentas(
          obtenerValorColumna(fila, "M2")
        ),

        valor_pagado_m2: limpiarNumeroVentas(
          obtenerValorColumna(fila, "Valor pagado por M2")
        ),

        uso_de_suelo:
          obtenerValorColumna(fila, "Uso de Suelo") || null,

        plan: obtenerValorColumna(fila, "Plan") || null,

        valor_cuota: limpiarNumeroVentas(
          obtenerValorColumna(fila, "Valor Cuota (USD)")
        ),

        cuotas_pagadas:
          limpiarNumeroVentas(
            obtenerValorColumna(fila, "Cuotas Pagas")
          ) || 0,

        cuotas_pendientes:
          limpiarNumeroVentas(
            obtenerValorColumna(fila, "Cuotas Pendientes")
          ) || 0,

        monto_cobrado: limpiarNumeroVentas(
          obtenerValorColumna(fila, "Monto Cobrado (USD)")
        ),

        saldo: limpiarNumeroVentas(
          obtenerValorColumna(fila, "Saldo Pendiente (USD)")
        ),

        estado: obtenerValorColumna(fila, "Estado") || null,
      };

  await pool.query(       "INSERT INTO movimientos2 SET ?",    datos     );
console.log(datos)
      clavesBD.add(clave);
      insertados++;
    }

    //await conexion.commit();

    res.json({
      mensaje: "Importación de ventas finalizada",
      total_filas_excel: data.length,
      insertados,
      duplicados,
      omitidos,
      duplicados_detalle: duplicadosDetalle,
    });
  } catch (error) {
    if (conexion) {
      await conexion.rollback();
    }

    console.error("Error procesando Excel de movimientos2:", error);

    res.status(500).json({
      error: "Error procesando Excel de ventas",
      detalle: error.message,
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

const enviarmovimiento = async (req, res) => {

    let { tipo, categoria, monto, medio_pago, detalle, fecha } = req.body;

    let debito = null;
    let credito = null;

    if (tipo === "egreso") {
        debito = monto;
    }

    if (tipo === "ingreso") {
        credito = monto;
    }

    let datoss = {
        fecha: fecha ? fecha : new Date(),
        concepto: categoria || null,
        debito: debito,
        credito: credito,
        descripcion: detalle || null
    }

    try {

        await pool.query('insert into movimientos set ?', datoss)

        res.send("Movimiento guardado con éxito")

    } catch (error) {

        console.log(error)
        res.status(500).send("Error al guardar movimiento")

    }

}



const agregarIccGral2 = async (req, res,) => {
    let { ICC, mes, anio, zona } = req.body;



    let datoss = {
        ICC,
        mes,
        anio,
        zona

    }

    //////////////try
    //

    if (zona == 'PIT') {
        console.log('PIT')
        const todasssss = await pool.query("select * from cuotas where mes =? and anio =? and zona =? ", [mes, anio, zona])

        let mensaje = "Estimado/a Cliente:\nLe informamos que ";

        for (let i = 0; i < todasssss.length; i++) {
            let cuiotacon = await agregaricc.calcularicc(todasssss[i], ICC);
            let nroCuota = todasssss[i]['nro_cuota'];
            let mes = todasssss[i]['mes'];
            let anio = todasssss[i]['anio'];
            let monto = cuiotacon.toLocaleString("es-AR", { style: "currency", currency: "ARS" });

            // Agregar información de cada cuota al mensaje
            mensaje += `el importe de su cuota N°${nroCuota}, correspondiente al mes de ${mes}/${anio} asciende a ${monto}. `;
        }

        // Agregar información final sobre vencimiento (puedes modificar la fecha si es diferente)
        mensaje += "Así mismo, el vencimiento de las mismas es el 10/03/2025.";

        console.log(mensaje);

        /////enviodemail.enviarmail.enviarmailsospechoso(email, asunto, encabezado, mensaje, ubicacion);

    } else {

        const todaxi = await pool.query("select * from cuotas_ic3 where mes =? and anio =?  ", [mes, anio])
        ICC = ICC / 100;
        ICC = parseFloat(ICC.toFixed(3)); // 0.108
        console.log(ICC);

        for (let indic = 0; indic < todaxi.length; indic++) {


            try {
                //  ICC = ICC / 100

                if (todaxi[indic]['cuota'] > 1) {


                    anteriorr = await pool.query('Select * from cuotas_ic3 where cuota = ? and id_cliente = ?', [todaxi[indic]["cuota"] - 1, todaxi[indic]["id_cliente"]])
                    base_calculoooo = anteriorr[0]['cuota_con_ajuste']


                    // diferencia = - cuota_con_ajuste
                    //console.log(diferencia)
                    console.log(ICC)
                    cuotaparaactualizar = {
                        base_calculo: anteriorr[0]['cuota_con_ajuste'],
                        ajuste: anteriorr[0]['cuota_con_ajuste'] * ICC,////ajuste anteiror* /
                        ajuste_icc: ICC,/// 0.4 
                        cuota_con_ajuste: (parseFloat(anteriorr[0]['cuota_con_ajuste']) * parseFloat(ICC)) + parseFloat(anteriorr[0]['cuota_con_ajuste'])



                    }

                    await pool.query('UPDATE cuotas_ic3 set ? WHERE id = ?', [cuotaparaactualizar, todaxi[indic]["id"]])



                }



            } catch (error) {
                console.log(error)


            }



        }
    }
    /////fin act cupta

    try {

        exis = await pool.query("select * from icc_historial where mes =? and anio =? and zona=?", [mes, anio, zona])
        if (exis.length > 0) {
            await pool.query('UPDATE icc_historial set ? WHERE id = ?', [datoss, exis[0]["id"]])
        } else {

            await pool.query('insert into icc_historial set?', datoss)
        }
    } catch (error) {
        // console.log(error)
    }
    res.send('Icc asignado con éxito');
}

const traermovimientos = async (req, res) => {
    try {

        const movimientos = await pool.query(
            `SELECT 
        id,
        fecha,
        fechacarga,
        tipo_operacion,
        categoria_general,
        subcategoria,
        proyecto,
        tipo_gasto,
saldo,
        debito,
        credito,
        descripcion,
        cuil_cuit,
        nombre_razon,
        concepto
      FROM movimientos
      ORDER BY fecha ASC`
        );

        res.json(movimientos);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al traer movimientos"
        });
    }
};




module.exports = {
    subirexceldemovimientos,
    historialIcc,
    pagoSi,
    borrarHistorial,
    asignarClave,
    asignarvalormetroc,
    consultarIcc,
    agregarIccgral,
    agregarIccGral2,
    enviarmovimiento,
    subirexceldemovimientos2,
    traermovimientos,
    mofificarmconcepto,
traeringresos,
analizarDescripcion,
CLASIFICACION_POR_CUIT
}