// Formatação brasileira garantida
export function formatBR(value: number, decimals: number = 2): string {
  // Garantir que é número
  const num = Number(value)
  
  // Separar parte inteira e decimal
  const fixed = num.toFixed(decimals)
  const [inteiro, decimal] = fixed.split('.')
  
  // Adicionar pontos a cada 3 dígitos (da direita para esquerda)
  const inteiroFormatado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  // Retornar com vírgula como separador decimal
  return decimal ? `${inteiroFormatado},${decimal}` : inteiroFormatado
}

export function formatCurrency(value: number): string {
  return `R$ ${formatBR(value, 2)}`
}

export function formatQuantity(value: number, decimals: number = 2): string {
  return formatBR(value, decimals)
}

// Testes
if (require.main === module) {
  console.log('Testes de formatação:')
  console.log('25000 =>', formatBR(25000, 2))           // 25.000,00
  console.log('30662.50 =>', formatCurrency(30662.50))  // R$ 30.662,50
  console.log('1234.56 =>', formatBR(1234.56, 2))       // 1.234,56
  console.log('1000000 =>', formatBR(1000000, 2))       // 1.000.000,00
}
