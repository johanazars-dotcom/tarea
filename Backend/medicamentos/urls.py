from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EstadisticasMedicamentosView,
    ExportarPDFView,
    OperacionProtegidaView,
    ReporteMedicamentoViewSet,
    VistaFiltrosDisponibles,
    VistaInyeccionMasiva,
    VistaValidacionSuperusuario,
)

router = DefaultRouter()
router.register(r'medicamentos', ReporteMedicamentoViewSet)

urlpatterns = [
    path('api/medicamentos/inyeccion/', VistaInyeccionMasiva.as_view(), name='inyeccion-medicamentos'),
    path('api/', include(router.urls)),
    path('api/filtros/', VistaFiltrosDisponibles.as_view(), name='filtros-disponibles'),
    path('api/estadisticas/', EstadisticasMedicamentosView.as_view(), name='estadisticas-medicamentos'),
    path('api/operacion-protegida/', OperacionProtegidaView.as_view(), name='operacion-protegida'),
    path('api/validar-superusuario/', VistaValidacionSuperusuario.as_view(), name='validar-superusuario'),
    path('api/exportar-pdf/', ExportarPDFView.as_view(), name='exportar_pdf'),
]