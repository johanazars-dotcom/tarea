from django.db import models

class ReporteMedicamento(models.Model):
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