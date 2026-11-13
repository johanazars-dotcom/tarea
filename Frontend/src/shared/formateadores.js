export function formatearMoneda(valor) {
  const numero = Number(valor || 0);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);
}

export function formatearNumero(valor) {
  const numero = Number(valor || 0);
  return new Intl.NumberFormat('es-CO').format(numero);
}
