from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EstadisticasMedicamentosView,
    ExportarPDFView,
    OperacionProtegidaView,
    ReporteMedicamentoViewSet,
    VistaFiltrosDisponibles,
)

router = DefaultRouter()
router.register(r'medicamentos', ReporteMedicamentoViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/filtros/', VistaFiltrosDisponibles.as_view(), name='filtros-disponibles'),
    path('api/estadisticas/', EstadisticasMedicamentosView.as_view(), name='estadisticas-medicamentos'),
    path('api/operacion-protegida/', OperacionProtegidaView.as_view(), name='operacion-protegida'),
    path('api/exportar-pdf/', ExportarPDFView.as_view(), name='exportar_pdf'),
]