from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
import random

from .models import ReporteMedicamento

TAMANO_PAGINA = 5000
MAX_PRECIO = Decimal('9999999999.99')
MAX_ENTERO_PG = 2147483647
FECHA_INICIO_CATALOGO = date(2021, 1, 1)
DIAS_RANGO_CATALOGO = 2100

LABORATORIOS_GENERICOS = (
    'GENFAR S.A.',
    'TECNOQUÍMICAS S.A.',
    'LAFRANCOL S.A.S.',
    'MK (TECNOQUÍMICAS)',
    'PROCAPS S.A.',
    'SIEGFRIED COLOMBIA',
)

LABORATORIOS_ESPECIALIZADOS = (
    'PFIZER S.A.S.',
    'NOVARTIS DE COLOMBIA',
    'SANOFI-AVENTIS',
    'BAYER S.A.',
    'B. BRAUN MEDICAL',
    'VITALIS S.A.C.I.',
)

ENTIDADES_COMPRADORAS = (
    'ESE HOSPITAL SAN JOSÉ DE SOGAMOSO',
    'HOSPITAL UNIVERSITARIO SAN IGNACIO',
    'FUNDACIÓN SANTA FE DE BOGOTÁ',
    'CLÍNICA REINA SOFÍA',
    'CLÍNICA SHAIO',
    'HOSPITAL PABLO TOBÓN URIBE',
    'EPS SANITAS S.A.S.',
    'NUEVA EPS S.A.',
    'SUBRED INTEGRADA DE SERVICIOS DE SALUD SUR',
    'AUDIFARMA S.A.',
    'DROGUERÍAS Y FARMACIAS CRUZ VERDE S.A.S.',
    'ESE HOSPITAL REGIONAL DE DUITAMA',
)

# Cada tupla define:
# (principio_activo, forma_farmaceutica, precio_min, precio_max, cant_min, cant_max, laboratorios)
CATALOGO_MEDICAMENTOS = (
    ('ACETAMINOFÉN 500 MG', 'TABLETA', 120, 480, 500, 25000, LABORATORIOS_GENERICOS),
    ('IBUPROFENO 400 MG', 'TABLETA RECUBIERTA', 180, 690, 400, 18000, LABORATORIOS_GENERICOS),
    ('AMOXICILINA 500 MG', 'CÁPSULA', 340, 1250, 300, 12000, LABORATORIOS_GENERICOS),
    ('LOSARTÁN POTÁSICO 50 MG', 'TABLETA RECUBIERTA', 210, 920, 600, 30000, LABORATORIOS_GENERICOS),
    ('OMEPRAZOL 20 MG', 'CÁPSULA', 180, 840, 500, 28000, LABORATORIOS_GENERICOS),
    ('METFORMINA CLORHIDRATO 850 MG', 'TABLETA', 220, 810, 800, 32000, LABORATORIOS_GENERICOS),
    ('ATORVASTATINA 20 MG', 'TABLETA RECUBIERTA', 310, 1450, 400, 16000, LABORATORIOS_GENERICOS),
    ('AZITROMICINA 500 MG', 'TABLETA', 1650, 5400, 150, 5000, LABORATORIOS_GENERICOS),
    ('CIPROFLOXACINO 500 MG', 'TABLETA', 450, 1950, 200, 8500, LABORATORIOS_GENERICOS),
    ('ENALAPRIL MALEATO 20 MG', 'TABLETA', 150, 620, 700, 26000, LABORATORIOS_GENERICOS),
    ('DICLOFENACO SÓDICO 75 MG/3 ML', 'SOLUCIÓN INYECTABLE', 1450, 4900, 100, 6000, LABORATORIOS_ESPECIALIZADOS),
    ('CEFTRIAXONA 1 G', 'POLVO PARA INYECCIÓN', 4800, 15800, 80, 3500, LABORATORIOS_ESPECIALIZADOS),
    ('CEFTAZIDIMA 1 G', 'POLVO PARA INYECCIÓN', 6200, 18900, 50, 2200, LABORATORIOS_ESPECIALIZADOS),
    ('INSULINA GLARGINA 100 UI/ML', 'SOLUCIÓN INYECTABLE', 64000, 142000, 20, 600, LABORATORIOS_ESPECIALIZADOS),
    ('SALBUTAMOL 100 MCG', 'INHALADOR', 9200, 23500, 60, 2800, LABORATORIOS_ESPECIALIZADOS),
    ('BUDESONIDA + FORMOTEROL 160/4.5 MCG', 'INHALADOR', 82000, 168000, 15, 450, LABORATORIOS_ESPECIALIZADOS),
    ('LEVOTIROXINA SÓDICA 50 MCG', 'TABLETA', 240, 1100, 500, 19000, LABORATORIOS_ESPECIALIZADOS),
    ('LORATADINA 10 MG', 'TABLETA', 160, 640, 400, 22000, LABORATORIOS_GENERICOS),
    ('CETIRIZINA 10 MG', 'JARABE', 6500, 17800, 80, 2400, LABORATORIOS_GENERICOS),
    ('CLOPIDOGREL 75 MG', 'TABLETA', 920, 3750, 250, 9000, LABORATORIOS_ESPECIALIZADOS),
    ('WARFARINA SÓDICA 5 MG', 'TABLETA', 380, 1520, 150, 4800, LABORATORIOS_GENERICOS),
    ('ESOMEPRAZOL 40 MG', 'POLVO PARA INYECCIÓN', 11500, 32800, 40, 1800, LABORATORIOS_ESPECIALIZADOS),
    ('HIDROCORTISONA 100 MG', 'POLVO PARA INYECCIÓN', 4500, 13900, 60, 2600, LABORATORIOS_ESPECIALIZADOS),
    ('METRONIDAZOL 500 MG', 'ÓVULO VAGINAL', 1150, 3800, 100, 4200, LABORATORIOS_GENERICOS),
    ('TOBRAMICINA + DEXAMETASONA', 'SUSPENSIÓN OFTÁLMICA', 17800, 41500, 30, 1200, LABORATORIOS_ESPECIALIZADOS),
    ('ACICLOVIR 200 MG', 'TABLETA', 410, 1650, 200, 7500, LABORATORIOS_GENERICOS),
    ('ALBENDAZOL 200 MG/10 ML', 'SUSPENSIÓN ORAL', 3100, 9400, 120, 4600, LABORATORIOS_GENERICOS),
    ('ACETAMINOFÉN + CODEÍNA 325/30 MG', 'TABLETA', 840, 2950, 180, 6800, LABORATORIOS_GENERICOS),
    ('TRAMADOL 50 MG/ML', 'SOLUCIÓN INYECTABLE', 2300, 7100, 90, 3200, LABORATORIOS_ESPECIALIZADOS),
    ('SULFAMETOXAZOL + TRIMETOPRIMA 800/160 MG', 'TABLETA', 280, 1180, 300, 11000, LABORATORIOS_GENERICOS),
)


def _limpiar_texto(valor, maximo, defecto='NO DEFINIDO'):
    """Normaliza espacios en blanco y recorta al tamano maximo permitido por el campo."""
    if valor is None:
        return defecto
    texto = ' '.join(str(valor).strip().split())
    return texto[:maximo] or defecto


def _parsear_fecha(valor):
    """Convierte texto YYYY-MM-DD o YYYY/MM/DD a objeto date."""
    if isinstance(valor, date) and not isinstance(valor, datetime):
        return valor
    if not valor:
        return None
    texto = str(valor).strip()[:10]
    for formato in ('%Y-%m-%d', '%Y/%m/%d'):
        try:
            return datetime.strptime(texto, formato).date()
        except ValueError:
            continue
    return None


def _parsear_decimal_positivo(valor):
    """Convierte un precio numerico a Decimal(2) positivo valido para el modelo."""
    if valor is None or valor == '':
        return None
    try:
        numero = Decimal(str(valor).strip()).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError):
        return None
    if numero <= Decimal('0') or numero > MAX_PRECIO:
        return None
    return numero


def _parsear_cantidad_positiva(valor):
    """Convierte una cantidad numerica a entero positivo dentro del rango de PostgreSQL."""
    if valor is None or valor == '':
        return None
    try:
        cantidad = int(Decimal(str(valor).strip()))
    except (InvalidOperation, ValueError):
        return None
    if cantidad < 1 or cantidad > MAX_ENTERO_PG:
        return None
    return cantidad


def _generar_fila_medicamento(indice):
    """Genera un registro deterministico y realista de compra de medicamento propio."""
    rng = random.Random(f'med-col-{indice}')
    principio, forma, p_min, p_max, c_min, c_max, laboratorios = rng.choice(CATALOGO_MEDICAMENTOS)
    centavos = rng.randint(p_min * 100, p_max * 100)
    precio = (Decimal(centavos) / Decimal('100')).quantize(Decimal('0.01'))
    cantidad = rng.randint(c_min, c_max)
    fecha = FECHA_INICIO_CATALOGO + timedelta(days=rng.randint(0, DIAS_RANGO_CATALOGO))

    return {
        'codigo_reporte': f'MED-COL-{indice:06d}',
        'principio_activo': principio,
        'laboratorio': rng.choice(laboratorios),
        'forma_farmaceutica': forma,
        'precio_unitario': str(precio),
        'cantidad_comprada': cantidad,
        'fecha_reporte': fecha.isoformat(),
        'entidad_compradora': rng.choice(ENTIDADES_COMPRADORAS),
    }


def consultar_pagina(limite, desplazamiento):
    """Devuelve una pagina de reportes propios de medicamentos en memoria."""
    if limite <= 0 or desplazamiento < 0:
        return []
    inicio = desplazamiento + 1
    fin = inicio + limite
    return [_generar_fila_medicamento(indice) for indice in range(inicio, fin)]


def fila_a_medicamento(fila):
    """Convierte una fila del catalogo propio en una instancia validada de ReporteMedicamento."""
    codigo = str(fila.get('codigo_reporte') or '').strip()[:80]
    fecha = _parsear_fecha(fila.get('fecha_reporte'))
    precio = _parsear_decimal_positivo(fila.get('precio_unitario'))
    cantidad = _parsear_cantidad_positiva(fila.get('cantidad_comprada'))
    if not codigo or not fecha or precio is None or cantidad is None:
        return None

    return ReporteMedicamento(
        codigo_reporte=codigo,
        principio_activo=_limpiar_texto(fila.get('principio_activo'), 255),
        laboratorio=_limpiar_texto(fila.get('laboratorio'), 255),
        forma_farmaceutica=_limpiar_texto(fila.get('forma_farmaceutica'), 150),
        precio_unitario=precio,
        cantidad_comprada=cantidad,
        fecha_reporte=fecha,
        entidad_compradora=_limpiar_texto(fila.get('entidad_compradora'), 255),
    )
