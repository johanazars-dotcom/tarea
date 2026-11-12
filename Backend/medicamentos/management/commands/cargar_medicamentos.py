import csv
from datetime import datetime
from django.core.management.base import BaseCommand
from medicamentos.models import ReporteMedicamento

class Command(BaseCommand):
    help = 'Carga masiva de registros de precios de medicamentos desde un archivo CSV'

    def add_arguments(self, parser):
        parser.add_argument('csv_path', type=str, help='Ruta al archivo CSV con los datos')

    def handle(self, *args, **options):
        csv_path = options['csv_path']
        self.stdout.write("Iniciando la lectura y limpieza de datos...")

        batch_size = 1000
        registros_lote = []
        contador = 0

        with open(csv_path, mode='r', encoding='utf-8') as archivo:
            lector = csv.DictReader(archivo)
            for fila in lector:
                try:
                    principio = fila.get('principio_activo', '').strip().upper()
                    lab = fila.get('laboratorio', '').strip().upper()
                    forma = fila.get('forma_farmaceutica', '').strip()
                    
                    precio_str = fila.get('precio_unitario', '0').replace(',', '').strip()
                    precio = float(precio_str) if precio_str else 0.0
                    
                    cantidad_str = fila.get('cantidad', '1').strip()
                    cantidad = int(cantidad_str) if cantidad_str else 1

                    fecha_str = fila.get('fecha', '').strip()
                    fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date() if fecha_str else datetime.now().date()

                    entidad = fila.get('entidad', 'Desconocida').strip()

                    if principio and precio > 0:
                        registros_lote.append(
                            ReporteMedicamento(
                                principio_activo=principio,
                                laboratorio=lab,
                                forma_farmaceutica=forma,
                                precio_unitario=precio,
                                cantidad_comprada=cantidad,
                                fecha_reporte=fecha,
                                entidad_compradora=entidad
                            )
                        )
                        contador += 1

                    if len(registros_lote) >= batch_size:
                        ReporteMedicamento.objects.bulk_create(registros_lote)
                        registros_lote = []
                        self.stdout.write(f"Procesados {contador} registros...")

                except Exception as e:
                    continue

            if registros_lote:
                ReporteMedicamento.objects.bulk_create(registros_lote)

        self.stdout.write(self.style.SUCCESS(f"Ingesta finalizada con exito. Total insertados: {contador}"))