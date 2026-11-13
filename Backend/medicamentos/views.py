from decimal import Decimal
import time
from django.db.models import Avg, Count, DecimalField, F, Max, Min, Q, Sum
from django.db.models.functions import ExtractYear
from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from rest_framework import filters, status, viewsets
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from .fuente_datos import TAMANO_PAGINA, consultar_pagina, fila_a_medicamento
from .models import ReporteMedicamento
from .paginacion import PaginacionMedicamentos
from .serializers import ReporteMedicamentoSerializer


def _aplicar_filtros_medicamentos(queryset, params, incluir_search=False):
    """Aplica filtros de dominio y busqueda textual de manera uniforme."""
    principio = (params.get('principio_activo') or '').strip()
    forma = (params.get('forma_farmaceutica') or '').strip()
    laboratorio = (params.get('laboratorio') or '').strip()
    entidad = (params.get('entidad_compradora') or '').strip()
    anio = (params.get('anio') or '').strip()

    if principio:
        queryset = queryset.filter(principio_activo__icontains=principio)
    if forma:
        queryset = queryset.filter(forma_farmaceutica__iexact=forma)
    if laboratorio:
        queryset = queryset.filter(laboratorio__iexact=laboratorio)
    if entidad:
        queryset = queryset.filter(entidad_compradora__iexact=entidad)
    if anio:
        try:
            queryset = queryset.filter(fecha_reporte__year=int(anio))
        except ValueError:
            queryset = queryset.none()

    if incluir_search:
        search = (params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(principio_activo__icontains=search)
                | Q(laboratorio__icontains=search)
                | Q(forma_farmaceutica__icontains=search)
                | Q(entidad_compradora__icontains=search)
            )

    return queryset


class ReporteMedicamentoViewSet(viewsets.ModelViewSet):
    queryset = ReporteMedicamento.objects.all().order_by('-fecha_reporte', '-id')
    serializer_class = ReporteMedicamentoSerializer
    pagination_class = PaginacionMedicamentos
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['principio_activo', 'laboratorio', 'forma_farmaceutica', 'entidad_compradora']
    ordering_fields = [
        'precio_unitario',
        'cantidad_comprada',
        'fecha_reporte',
        'principio_activo',
        'laboratorio',
        'forma_farmaceutica',
        'entidad_compradora',
    ]
    ordering = ['-fecha_reporte', '-id']
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return _aplicar_filtros_medicamentos(super().get_queryset(), self.request.query_params)


class VistaFiltrosDisponibles(APIView):
    """Retorna los valores unicos disponibles en la base de datos para filtros."""

    def get(self, request):
        base = ReporteMedicamento.objects.all()
        anios = (
            base.annotate(anio=ExtractYear('fecha_reporte'))
            .values_list('anio', flat=True)
            .distinct()
            .order_by('-anio')
        )
        return Response({
            'principios_activos': list(base.values_list('principio_activo', flat=True).distinct().order_by('principio_activo')),
            'formas_farmaceuticas': list(base.values_list('forma_farmaceutica', flat=True).distinct().order_by('forma_farmaceutica')),
            'laboratorios': list(base.values_list('laboratorio', flat=True).distinct().order_by('laboratorio')),
            'entidades_compradoras': list(base.values_list('entidad_compradora', flat=True).distinct().order_by('entidad_compradora')),
            'anios': [a for a in anios if a is not None],
        })


class EstadisticasMedicamentosView(APIView):
    AGRUPACIONES_VALIDAS = {
        'principio_activo': ['principio_activo'],
        'forma_farmaceutica': ['forma_farmaceutica'],
        'laboratorio': ['laboratorio'],
        'entidad_compradora': ['entidad_compradora'],
        'anio_reporte': ['anio_reporte'],
        'principio_anio': ['principio_activo', 'anio_reporte'],
    }

    def get(self, request):
        queryset = _aplicar_filtros_medicamentos(
            ReporteMedicamento.objects.all(),
            request.query_params,
            incluir_search=True,
        )

        agrupar_por = request.query_params.get('agrupar_por', 'principio_activo')
        if agrupar_por not in self.AGRUPACIONES_VALIDAS:
            agrupar_por = 'principio_activo'
        campos_grupo = self.AGRUPACIONES_VALIDAS[agrupar_por]

        queryset_con_anio = queryset.annotate(anio_reporte=ExtractYear('fecha_reporte'))
        valor_expr = F('precio_unitario') * F('cantidad_comprada')

        agrupado = (
            queryset_con_anio.values(*campos_grupo)
            .annotate(
                precio_promedio=Avg('precio_unitario'),
                precio_maximo=Max('precio_unitario'),
                precio_minimo=Min('precio_unitario'),
                volumen_total=Sum('cantidad_comprada'),
                valor_total=Sum(valor_expr, output_field=DecimalField(max_digits=18, decimal_places=2)),
                total_registros=Count('id'),
            )
            .order_by('-volumen_total')[:50]
        )

        distribucion = []
        for fila in agrupado:
            if agrupar_por == 'principio_anio':
                etiqueta = f"{fila['principio_activo']} ({fila['anio_reporte']})"
            elif agrupar_por == 'anio_reporte':
                etiqueta = str(fila['anio_reporte'])
            else:
                etiqueta = str(fila[campos_grupo[0]])

            fila['grupo'] = etiqueta
            distribucion.append(fila)

        resumen_raw = queryset.aggregate(
            global_precio_promedio=Avg('precio_unitario'),
            global_precio_maximo=Max('precio_unitario'),
            global_precio_minimo=Min('precio_unitario'),
            global_volumen=Sum('cantidad_comprada'),
            valor_total_compras=Sum(valor_expr, output_field=DecimalField(max_digits=18, decimal_places=2)),
            conteo_total=Count('id'),
        )

        resumen_general = {
            'global_precio_promedio': round(float(resumen_raw['global_precio_promedio'] or 0), 2),
            'global_precio_maximo': float(resumen_raw['global_precio_maximo'] or Decimal('0')),
            'global_precio_minimo': float(resumen_raw['global_precio_minimo'] or Decimal('0')),
            'global_volumen': int(resumen_raw['global_volumen'] or 0),
            'valor_total_compras': round(float(resumen_raw['valor_total_compras'] or 0), 2),
            'conteo_total': int(resumen_raw['conteo_total'] or 0),
        }

        return Response({
            'resumen_general': resumen_general,
            'agrupar_por': agrupar_por,
            'distribucion_agrupada': distribucion,
        })


class OperacionProtegidaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        total_registros = ReporteMedicamento.objects.count()
        return Response({
            'status': 'success',
            'message': 'Operacion protegida ejecutada correctamente.',
            'usuario': request.user.username,
            'registros_actuales': total_registros,
            'timestamp': timezone.now().isoformat(),
        })


class VistaValidacionSuperusuario(APIView):
    """Valida que el token pertenezca a un usuario autenticado con rol de superusuario."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = request.user
        if not usuario.is_superuser:
            return Response(
                {
                    'status': 'forbidden',
                    'es_superusuario': False,
                    'usuario': usuario.username,
                    'detail': 'El token es valido, pero la cuenta no tiene privilegios de superusuario.',
                    'timestamp': timezone.now().isoformat(),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response({
            'status': 'success',
            'es_superusuario': True,
            'usuario': usuario.username,
            'es_staff': usuario.is_staff,
            'message': 'Token de superusuario validado correctamente.',
            'timestamp': timezone.now().isoformat(),
        })


class ExportarPDFView(APIView):
    def get(self, request):
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="reporte_medicamentos.pdf"'

        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter

        p.drawString(50, height - 50, "Reporte Oficial de Precios y Compras de Medicamentos")
        p.drawString(50, height - 70, "Desarrollador: Johan Salazar Lopez - SENA ADSO (Ficha 3171062)")

        medicamentos = _aplicar_filtros_medicamentos(
            ReporteMedicamento.objects.all().order_by('-fecha_reporte', '-id'),
            request.query_params,
            incluir_search=True,
        )[:25]
        y = height - 110

        for item in medicamentos:
            texto = f"{item.principio_activo} - {item.laboratorio} ({item.forma_farmaceutica}) - ${item.precio_unitario}"
            p.drawString(50, y, texto)
            y -= 20
            if y < 50:
                p.showPage()
                y = height - 50

        p.showPage()
        p.save()
        return response


def descargar_medicamentos(cantidad, desplazamiento=0):
    """Genera e inyecta reportes propios de medicamentos por lotes en PostgreSQL."""
    inicio = time.perf_counter()
    existentes = set(
        ReporteMedicamento.objects.exclude(codigo_reporte__isnull=True)
        .values_list('codigo_reporte', flat=True)
    )
    nuevos = []
    recibidos = 0
    omitidos = 0
    cursor = desplazamiento

    while recibidos < cantidad:
        lote = consultar_pagina(min(TAMANO_PAGINA, cantidad - recibidos), cursor)
        if not lote:
            break
        recibidos += len(lote)
        cursor += len(lote)
        for fila in lote:
            medicamento = fila_a_medicamento(fila)
            if not medicamento or medicamento.codigo_reporte in existentes:
                omitidos += 1
                continue
            existentes.add(medicamento.codigo_reporte)
            nuevos.append(medicamento)

    if nuevos:
        ReporteMedicamento.objects.bulk_create(nuevos, batch_size=1000, ignore_conflicts=True)

    ms = (time.perf_counter() - inicio) * 1000
    return {
        'creados': len(nuevos),
        'recibidos': recibidos,
        'omitidos': omitidos,
        'total': ReporteMedicamento.objects.count(),
        'ms': round(ms, 2),
        'por_segundo': round(len(nuevos) / (ms / 1000), 1) if ms > 0 else 0,
    }


class VistaInyeccionMasiva(APIView):
    """Inyecta un lote de reportes propios de medicamentos en PostgreSQL."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            cantidad = int(request.data.get('cantidad'))
        except (TypeError, ValueError):
            cantidad = 0
        if not 1 <= cantidad <= 50000:
            return Response(
                {'detalle': 'cantidad debe ser un entero entre 1 y 50000.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.data.get('continuar'):
            desplazamiento = ReporteMedicamento.objects.filter(
                codigo_reporte__startswith='MED-COL-'
            ).count()
        else:
            try:
                desplazamiento = int(request.data.get('desplazamiento', 0))
            except (TypeError, ValueError):
                desplazamiento = -1
            if desplazamiento < 0:
                return Response(
                    {'detalle': 'desplazamiento debe ser un entero mayor o igual a 0.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            return Response(descargar_medicamentos(cantidad, desplazamiento=desplazamiento))
        except Exception as exc:
            return Response(
                {'detalle': f'Error generando lote de medicamentos: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
