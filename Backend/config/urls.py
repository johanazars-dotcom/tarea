from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('medicamentos.urls')),
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    re_path(
        r'^(?!admin/|api/|api-token-auth/|static/).*$',
        TemplateView.as_view(template_name='index.html'),
        name='frontend',
    ),
]
