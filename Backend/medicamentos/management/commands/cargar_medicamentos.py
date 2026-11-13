import csv
from django.core.management.base import BaseCommand
from medicamentos.models import ReporteMedicamento

class Command(BaseCommand):
    help = 'Carga masiva de medicamentos desde un archivo CSV'

    def handle(self, *args, **options):
        ruta_csv = 'medicamentos.csv'
        
        # Limpiamos la tabla primero para evitar duplicados con registros vacios
        ReporteMedicamento.objects.all().delete()
        
        lotes = []
        contador = 0

        with open(ruta_csv, encoding='utf-8') as archivo:
            lector = csv.DictReader(archivo)
            for fila in lector:
                lotes.append(ReporteMedicamento(
                    principio_activo=fila.get('principio_activo', ''),
                    laboratorio=fila.get('laboratorio', ''),
                    forma_farmaceutica=fila.get('forma_farmaceutica', ''),
                    precio_unitario=float(fila.get('precio_unitario', 0) or 0),
                    cantidad_comprada=int(fila.get('cantidad', 0) or 0),
                    fecha_reporte=fila.get('fecha', '2026-01-01'),
                    entidad_compradora=fila.get('entidad', '')
                ))
                contador += 1

                if len(lotes) >= 1000:
                    ReporteMedicamento.objects.bulk_create(lotes)
                    lotes = []

        if lotes:
            ReporteMedicamento.objects.bulk_create(lotes)

        self.stdout.write(self.style.SUCCESS(f'Se cargaron {contador} registros correctamente.'))