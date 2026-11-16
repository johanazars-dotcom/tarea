from django.db import models


class ReporteMedicamento(models.Model):
    codigo_reporte = models.CharField(max_length=80, unique=True, null=True, blank=True)
    principio_activo = models.CharField(max_length=255, db_index=True)
    laboratorio = models.CharField(max_length=255, db_index=True)
    forma_farmaceutica = models.CharField(max_length=150)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    cantidad_comprada = models.IntegerField()
    fecha_reporte = models.DateField(db_index=True)
    entidad_compradora = models.CharField(max_length=255)
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.principio_activo} - {self.laboratorio} (${self.precio_unitario})"


class VentaMedicamento(models.Model):
    medicamento = models.ForeignKey(
        ReporteMedicamento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ventas',
    )
    principio_activo = models.CharField(max_length=255)
    laboratorio = models.CharField(max_length=255)
    forma_farmaceutica = models.CharField(max_length=150)
    cantidad_vendida = models.PositiveIntegerField()
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    total_venta = models.DecimalField(max_digits=14, decimal_places=2)
    comprador = models.CharField(max_length=255)
    vendedor = models.CharField(max_length=150, blank=True, default='')
    observacion = models.CharField(max_length=255, blank=True, default='')
    fecha_venta = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"Venta #{self.id}: {self.principio_activo} x {self.cantidad_vendida}"
