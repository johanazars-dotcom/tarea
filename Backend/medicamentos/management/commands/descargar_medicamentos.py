from django.core.management.base import BaseCommand

from medicamentos.models import ReporteMedicamento
from medicamentos.views import descargar_medicamentos


class Command(BaseCommand):
    help = 'Genera e inyecta reportes del catalogo propio de medicamentos en PostgreSQL.'

    def add_arguments(self, parser):
        parser.add_argument('cantidad', nargs='?', type=int, default=2000)
        parser.add_argument(
            '--solo-si-vacia',
            action='store_true',
            help='Solo inserta registros si la tabla ReporteMedicamento esta vacia.',
        )

    def handle(self, *args, **options):
        if options['solo_si_vacia'] and ReporteMedicamento.objects.exists():
            total = ReporteMedicamento.objects.count()
            self.stdout.write(f'La base de datos ya contiene {total} medicamentos; se omite la carga inicial.')
            return

        resultado = descargar_medicamentos(options['cantidad'])
        self.stdout.write(
            self.style.SUCCESS(
                f"Creados: {resultado['creados']} | Omitidos: {resultado['omitidos']} "
                f"| Total BD: {resultado['total']} | Tiempo: {resultado['ms']} ms"
            )
        )
