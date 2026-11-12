from django.contrib import admin
from .models import ReporteMedicamento

@admin.register(ReporteMedicamento)
class ReporteMedicamentoAdmin(admin.ModelAdmin):
    list_display = ('principio_activo', 'laboratorio', 'precio_unitario', 'cantidad_comprada', 'fecha_reporte', 'entidad_compradora')
    search_fields = ('principio_activo', 'laboratorio', 'entidad_compradora')
    list_filter = ('fecha_reporte', 'forma_farmaceutica')