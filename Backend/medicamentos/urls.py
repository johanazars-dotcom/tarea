from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReporteMedicamentoViewSet, EstadisticasMedicamentosView, OperacionProtegidaView, ExportarPDFView

router = DefaultRouter()
router.register(r'medicamentos', ReporteMedicamentoViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/estadisticas/', EstadisticasMedicamentosView.as_view(), name='estadisticas-medicamentos'),
    path('api/operacion-protegida/', OperacionProtegidaView.as_view(), name='operacion-protegida'),
    path('api/exportar-pdf/', ExportarPDFView.as_view(), name='exportar_pdf'),
]