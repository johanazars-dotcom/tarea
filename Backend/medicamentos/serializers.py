from decimal import Decimal
from rest_framework import serializers

from .models import ReporteMedicamento, VentaMedicamento


class ReporteMedicamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReporteMedicamento
        fields = '__all__'

    def validate_codigo_reporte(self, value):
        limpio = (value or '').strip()
        return limpio or None

    def validate_precio_unitario(self, value):
        if value is None or value <= Decimal('0'):
            raise serializers.ValidationError('El precio unitario debe ser mayor a 0.')
        return value

    def validate_cantidad_comprada(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError('La cantidad en inventario no puede ser negativa.')
        return value


class VentaMedicamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = VentaMedicamento
        fields = '__all__'


class RegistrarVentaSerializer(serializers.Serializer):
    medicamento_id = serializers.IntegerField(min_value=1)
    cantidad = serializers.IntegerField(min_value=1)
    comprador = serializers.CharField(max_length=255)
    observacion = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')

    def validate_comprador(self, value):
        limpio = ' '.join(value.strip().split())
        if not limpio:
            raise serializers.ValidationError('Debes indicar el nombre del comprador o entidad.')
        return limpio
