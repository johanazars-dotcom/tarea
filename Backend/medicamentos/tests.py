from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ReporteMedicamento


class PruebasAPIMedicamentos(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='auditor', password='PasswordSegura123!')
        self.superuser = User.objects.create_superuser(
            username='superadmin',
            email='admin@example.com',
            password='SuperPassword123!',
        )

        registros = [
            ReporteMedicamento(
                principio_activo='ACETAMINOFEN',
                laboratorio='FARMACOL',
                forma_farmaceutica='TABLETA',
                precio_unitario=Decimal('1000.00'),
                cantidad_comprada=100,
                fecha_reporte=date(2024, 3, 10),
                entidad_compradora='HOSPITAL CENTRAL',
            ),
            ReporteMedicamento(
                principio_activo='ACETAMINOFEN',
                laboratorio='BIOPHARMA',
                forma_farmaceutica='JARABE',
                precio_unitario=Decimal('5000.00'),
                cantidad_comprada=50,
                fecha_reporte=date(2025, 5, 15),
                entidad_compradora='EPS SANITAS',
            ),
            ReporteMedicamento(
                principio_activo='IBUPROFENO',
                laboratorio='FARMACOL',
                forma_farmaceutica='TABLETA',
                precio_unitario=Decimal('2000.00'),
                cantidad_comprada=200,
                fecha_reporte=date(2025, 6, 20),
                entidad_compradora='EPS SANITAS',
            ),
        ]
        # Agregamos registros adicionales para verificar paginacion > 10
        for i in range(12):
            registros.append(
                ReporteMedicamento(
                    principio_activo='LOSARTAN',
                    laboratorio='GENERICOS COLOMBIA',
                    forma_farmaceutica='CAPSULA',
                    precio_unitario=Decimal('3000.00') + i,
                    cantidad_comprada=10 + i,
                    fecha_reporte=date(2024, 1, 1 + i),
                    entidad_compradora='CLINICA BOYACA',
                )
            )
        ReporteMedicamento.objects.bulk_create(registros)

    def test_exploracion_paginada_filtros_busqueda_y_orden(self):
        url = '/api/medicamentos/'

        # Pagina 1 por defecto (page_size=10) de 15 registros totales
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 15)
        self.assertEqual(len(res.data['results']), 10)
        self.assertIsNotNone(res.data['next'])

        # Pagina 2 trae los 5 restantes
        res_p2 = self.client.get(url, {'page': 2})
        self.assertEqual(res_p2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_p2.data['results']), 5)

        # Filtro combinado: forma_farmaceutica + busqueda + ordenamiento por precio descendente
        res_filtrado = self.client.get(
            url,
            {
                'forma_farmaceutica': 'TABLETA',
                'search': 'FARMACOL',
                'ordering': '-precio_unitario',
            },
        )
        self.assertEqual(res_filtrado.status_code, status.HTTP_200_OK)
        self.assertEqual(res_filtrado.data['count'], 2)
        precios = [float(item['precio_unitario']) for item in res_filtrado.data['results']]
        self.assertEqual(precios, [2000.0, 1000.0])

        # Filtro por anio y entidad
        res_anio = self.client.get(url, {'anio': '2025', 'entidad_compradora': 'EPS SANITAS'})
        self.assertEqual(res_anio.status_code, status.HTTP_200_OK)
        self.assertEqual(res_anio.data['count'], 2)

    def test_estadisticas_dinamicas_recalculan_por_segmento(self):
        url = reverse('estadisticas-medicamentos')

        # Global sin filtros
        res_global = self.client.get(url)
        self.assertEqual(res_global.status_code, status.HTTP_200_OK)
        self.assertEqual(res_global.data['resumen_general']['conteo_total'], 15)
        self.assertEqual(res_global.data['resumen_general']['global_precio_maximo'], 5000.0)

        # Filtrado por entidad EPS SANITAS (registros 2025: 5000x50 y 2000x200)
        res_eps = self.client.get(url, {'entidad_compradora': 'EPS SANITAS', 'agrupar_por': 'forma_farmaceutica'})
        self.assertEqual(res_eps.status_code, status.HTTP_200_OK)
        resumen = res_eps.data['resumen_general']
        self.assertEqual(resumen['conteo_total'], 2)
        self.assertEqual(resumen['global_precio_promedio'], 3500.0)
        self.assertEqual(resumen['global_precio_maximo'], 5000.0)
        self.assertEqual(resumen['global_volumen'], 250)
        self.assertEqual(len(res_eps.data['distribucion_agrupada']), 2)
        self.assertEqual(res_eps.data['distribucion_agrupada'][0]['grupo'], 'TABLETA')

        # Segmento sin coincidencias devuelve 0 sin errores
        res_vacio = self.client.get(url, {'anio': '1999'})
        self.assertEqual(res_vacio.status_code, status.HTTP_200_OK)
        self.assertEqual(res_vacio.data['resumen_general']['conteo_total'], 0)
        self.assertEqual(res_vacio.data['resumen_general']['global_precio_promedio'], 0)

    def test_filtros_disponibles(self):
        res = self.client.get(reverse('filtros-disponibles'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('TABLETA', res.data['formas_farmaceuticas'])
        self.assertIn(2025, res.data['anios'])

    def test_flujo_completo_autenticacion_y_operacion_protegida(self):
        protected_url = reverse('operacion-protegida')
        login_url = reverse('api_token_auth')

        # 1. Sin credencial -> 401 Unauthorized
        res_sin_auth = self.client.post(protected_url)
        self.assertEqual(res_sin_auth.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Token invalido -> 401 Unauthorized
        self.client.credentials(HTTP_AUTHORIZATION='Token tokeninvalido123')
        res_token_malo = self.client.post(protected_url)
        self.assertEqual(res_token_malo.status_code, status.HTTP_401_UNAUTHORIZED)

        # 3. Credenciales incorrectas -> 400 Bad Request
        self.client.credentials()
        res_bad_login = self.client.post(login_url, {'username': 'auditor', 'password': 'wrong'})
        self.assertEqual(res_bad_login.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Login valido -> entrega token
        res_login = self.client.post(login_url, {'username': 'auditor', 'password': 'PasswordSegura123!'})
        self.assertEqual(res_login.status_code, status.HTTP_200_OK)
        self.assertIn('token', res_login.data)
        token = res_login.data['token']

        # 5. Operacion protegida con token valido -> 200 OK
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        res_ok = self.client.post(protected_url)
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ok.data['status'], 'success')
        self.assertEqual(res_ok.data['usuario'], 'auditor')
        self.assertEqual(res_ok.data['registros_actuales'], 15)

    def test_validacion_token_superusuario(self):
        validar_url = reverse('validar-superusuario')
        login_url = reverse('api_token_auth')

        # 1. Sin token -> 401 Unauthorized
        res_sin_token = self.client.post(validar_url)
        self.assertEqual(res_sin_token.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Usuario normal (no superusuario) -> 403 Forbidden
        res_user = self.client.post(login_url, {'username': 'auditor', 'password': 'PasswordSegura123!'})
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {res_user.data['token']}")
        res_forbidden = self.client.post(validar_url)
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(res_forbidden.data['es_superusuario'])

        # 3. Superusuario -> 200 OK y es_superusuario=True
        self.client.credentials()
        res_super_login = self.client.post(login_url, {'username': 'superadmin', 'password': 'SuperPassword123!'})
        self.assertEqual(res_super_login.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {res_super_login.data['token']}")
        res_validado = self.client.post(validar_url)
        self.assertEqual(res_validado.status_code, status.HTTP_200_OK)
        self.assertTrue(res_validado.data['es_superusuario'])
        self.assertEqual(res_validado.data['usuario'], 'superadmin')

    def test_inyeccion_masiva_catalogo_propio_y_deduplicacion(self):
        url_inyeccion = reverse('inyeccion-medicamentos')
        login_url = reverse('api_token_auth')

        # 1. Sin autenticacion -> 401 Unauthorized
        res_anon = self.client.post(url_inyeccion, {'cantidad': 5})
        self.assertEqual(res_anon.status_code, status.HTTP_401_UNAUTHORIZED)

        res_login = self.client.post(login_url, {'username': 'superadmin', 'password': 'SuperPassword123!'})
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {res_login.data['token']}")

        # 2. Cantidad invalida -> 400 Bad Request
        res_invalida = self.client.post(url_inyeccion, {'cantidad': 0})
        self.assertEqual(res_invalida.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Generacion inicial con catalogo propio de medicamentos -> crea 5
        res_ok = self.client.post(url_inyeccion, {'cantidad': 5}, format='json')
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ok.data['creados'], 5)
        self.assertEqual(res_ok.data['omitidos'], 0)
        self.assertEqual(res_ok.data['total'], 20)

        creado = ReporteMedicamento.objects.get(codigo_reporte='MED-COL-000001')
        self.assertTrue(creado.principio_activo)
        self.assertTrue(creado.laboratorio)
        self.assertGreater(creado.precio_unitario, Decimal('0'))
        self.assertGreaterEqual(creado.cantidad_comprada, 1)

        # 4. Segunda ejecucion en el mismo rango -> omite duplicados
        res_dup = self.client.post(url_inyeccion, {'cantidad': 5}, format='json')
        self.assertEqual(res_dup.status_code, status.HTTP_200_OK)
        self.assertEqual(res_dup.data['creados'], 0)
        self.assertEqual(res_dup.data['omitidos'], 5)
        self.assertEqual(res_dup.data['total'], 20)

        # 5. Con continuar=True -> genera los siguientes 5 sin duplicar
        res_next = self.client.post(url_inyeccion, {'cantidad': 5, 'continuar': True}, format='json')
        self.assertEqual(res_next.status_code, status.HTTP_200_OK)
        self.assertEqual(res_next.data['creados'], 5)
        self.assertEqual(res_next.data['total'], 25)
        self.assertTrue(ReporteMedicamento.objects.filter(codigo_reporte='MED-COL-000010').exists())
