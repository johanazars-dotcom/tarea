from django.contrib import admin

from .models import ReporteMedicamento, VentaMedicamento


@admin.register(ReporteMedicamento)
class ReporteMedicamentoAdmin(admin.ModelAdmin):
    list_display = ('principio_activo', 'laboratorio', 'precio_unitario', 'cantidad_comprada', 'fecha_reporte', 'entidad_compradora')
    search_fields = ('principio_activo', 'laboratorio', 'entidad_compradora')
    list_filter = ('fecha_reporte', 'forma_farmaceutica')


@admin.register(VentaMedicamento)
class VentaMedicamentoAdmin(admin.ModelAdmin):
    list_display = ('id', 'principio_activo', 'cantidad_vendida', 'precio_unitario', 'total_venta', 'comprador', 'fecha_venta')
    search_fields = ('principio_activo', 'laboratorio', 'comprador', 'vendedor')
    list_filter = ('fecha_venta',)
