from rest_framework import viewsets, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.db.models import Avg, Max, Sum, Count
from django.db.models.functions import ExtractYear
from .models import ReporteMedicamento
from .serializers import ReporteMedicamentoSerializer
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

class ReporteMedicamentoViewSet(viewsets.ModelViewSet):
    queryset = ReporteMedicamento.objects.all().order_by('-fecha_reporte')
    serializer_class = ReporteMedicamentoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['principio_activo', 'laboratorio', 'entidad_compradora']
    ordering_fields = ['precio_unitario', 'cantidad_comprada', 'fecha_reporte']
    permission_classes = [IsAuthenticatedOrReadOnly]

class EstadisticasMedicamentosView(APIView):
    def get(self, request):
        principio = request.query_params.get('principio_activo', None)
        anio = request.query_params.get('anio', None)

        queryset = ReporteMedicamento.objects.all()

        if principio:
            queryset = queryset.filter(principio_activo__icontains=principio)
        if anio:
            queryset = queryset.annotate(anio_reporte=ExtractYear('fecha_reporte')).filter(anio_reporte=anio)

        estadisticas = queryset.annotate(
            anio_reporte=ExtractYear('fecha_reporte')
        ).values('principio_activo', 'anio_reporte').annotate(
            precio_promedio=Avg('precio_unitario'),
            precio_maximo=Max('precio_unitario'),
            volumen_total=Sum('cantidad_comprada'),
            total_registros=Count('id')
        ).order_by('-volumen_total')[:50]

        resumen_general = queryset.aggregate(
            global_precio_promedio=Avg('precio_unitario'),
            global_precio_maximo=Max('precio_unitario'),
            global_volumen=Sum('cantidad_comprada'),
            conteo_total=Count('id')
        )

        return Response({
            "resumen_general": resumen_general,
            "distribucion_agrupada": list(estadisticas)
        })

class OperacionProtegidaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        total_registros = ReporteMedicamento.objects.count()
        return Response({
            "status": "success",
            "message": "Operacion protegida ejecutada correctamente.",
            "registros_actuales": total_registros
        })

from django.http import HttpResponse
from rest_framework.views import APIView
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from .models import ReporteMedicamento

class ExportarPDFView(APIView):
    def get(self, request):
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="reporte_medicamentos.pdf"'

        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter  # Usamos la tupla letter directamente

        # Encabezado del reporte
        p.drawString(50, height - 50, "Reporte Oficial de Precios y Compras de Medicamentos")
        p.drawString(50, height - 70, "Desarrollador: Johan Salazar Lopez - SENA ADSO (Ficha 3171062)")
        
        # Listar registros en el PDF
        medicamentos = ReporteMedicamento.objects.all()[:20]
        y = height - 110
        
        for item in medicamentos:
            texto = f"{item.principio_activo} - {item.laboratorio} - ${item.precio_unitario}"
            p.drawString(50, y, texto)
            y -= 20
            if y < 50:
                p.showPage()
                y = height - 50

        p.showPage()
        p.save()
        return response