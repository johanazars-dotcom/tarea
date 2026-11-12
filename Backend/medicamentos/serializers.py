from rest_framework import serializers
from .models import ReporteMedicamento

class ReporteMedicamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReporteMedicamento
        fields = '__all__'