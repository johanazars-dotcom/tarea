"""Paginacion del listado de medicamentos."""
from rest_framework.pagination import PageNumberPagination


class PaginacionMedicamentos(PageNumberPagination):
    """Pagina de 10 registros por defecto: el panel la ajusta con ?page_size=."""

    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100
