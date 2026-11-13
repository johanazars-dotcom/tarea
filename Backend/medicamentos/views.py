from decimal import Decimal
from django.db.models import Avg, Count, DecimalField, F, Max, Min, Q, Sum
from django.db.models.functions import ExtractYear
from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from rest_framework import filters, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ReporteMedicamento
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


class PaginacionMedicamentos(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


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
