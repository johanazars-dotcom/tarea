import csv
import random
from datetime import datetime, timedelta

principios = ['ACETAMINOFEN', 'IBUPROFENO', 'OMEPRAZOL', 'AMOXICILINA', 'LOSARTAN', 'DICLOFENACO', 'METFORMINA', 'SALBUTAMOL', 'LORATADINA', 'ASPIRINA']
laboratorios = ['LABORATORIO PHARMA', 'GENERICOS COLOMBIA', 'FARMACOL', 'BIOPHARMA', 'SENA SALUD', 'MEDICAMENTOS ANDINOS', 'LABORATORIOS UNIDOS']
formas = ['TABLETA', 'CAPSULA', 'JARABE', 'AMPOLLA', 'CREMA']
entidades = ['HOSPITAL CENTRAL', 'CLINICA DEL NORTE', 'EPS SANITAS', 'HOSPITAL REGIONAL', 'EPS SURA', 'CLINICA BOYACA']

fecha_inicio = datetime(2024, 1, 1)

with open('medicamentos.csv', mode='w', newline='', encoding='utf-8') as archivo:
    writer = csv.writer(archivo)
    writer.writerow(['principio_activo', 'laboratorio', 'forma_farmaceutica', 'precio_unitario', 'cantidad', 'fecha', 'entidad'])
    
    for i in range(1, 2001):
        principio = random.choice(principios)
        laboratorio = random.choice(laboratorios)
        forma = random.choice(formas)
        precio = round(random.uniform(1000.0, 50000.0), 2)
        cantidad = random.randint(10, 500)
        dias_aleatorios = random.randint(0, 700)
        fecha = (fecha_inicio + timedelta(days=dias_aleatorios)).strftime('%Y-%m-%d')
        entidad = random.choice(entidades)
        
        writer.writerow([principio, laboratorio, forma, precio, cantidad, fecha, entidad])

print("Archivo medicamentos.csv generado con 2000 registros con exito.")