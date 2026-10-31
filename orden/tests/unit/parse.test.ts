import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from '../../src/lib/parse'

// Viernes 30/10/2026 12:00 hora local
const NOW = new Date(2026, 9, 30, 12, 0).getTime()

describe('parseQuickAdd', () => {
  it('detecta ambiente, persona, tiempo y prioridad', () => {
    const p = parseQuickAdd('colgar cuadros living con Nacho 30min !', [], NOW)
    expect(p.title).toBe('Colgar cuadros')
    expect(p.room).toBe('living')
    expect(p.people).toEqual(['Nacho'])
    expect(p.minutes).toBe(30)
    expect(p.minutesDetected).toBe(true)
    expect(p.priority).toBe(1)
    expect(p.category).toBe('montaje')
  })

  it('reconoce urgente y horas', () => {
    const p = parseQuickAdd('arreglar enchufes de la cocina 1h30 !!', [], NOW)
    expect(p.priority).toBe(2)
    expect(p.minutes).toBe(90)
    expect(p.room).toBe('cocina')
    expect(p.category).toBe('electricidad')
    expect(p.title).toBe('Arreglar enchufes de la cocina')
  })

  it('saca el ambiente usado como etiqueta pero no el de la frase', () => {
    expect(parseQuickAdd('colgar espejo baño', [], NOW).title).toBe('Colgar espejo')
    expect(parseQuickAdd('colgar espejo en el baño', [], NOW).title).toBe('Colgar espejo')
    expect(parseQuickAdd('limpiar azulejos del baño', [], NOW).title).toBe('Limpiar azulejos del baño')
  })

  it('casos raros que encontró QA', () => {
    const metros = parseQuickAdd('comprar 5 m de cable canal', [], NOW)
    expect(metros.title).toBe('Comprar 5 m de cable canal')
    expect(metros.minutesDetected).toBe(false)
    expect(parseQuickAdd('cortar madera a 1.20 m', [], NOW).title).toBe('Cortar madera a 1.20 m')
    const manana = parseQuickAdd('limpiar heladera a la mañana', [], NOW)
    expect(manana.due).toBeUndefined()
    expect(manana.title).toBe('Limpiar heladera a la mañana')
    const pasado = parseQuickAdd('pasado mañana limpiar heladera', [], NOW)
    expect(pasado.due).toBe('2026-11-01')
    expect(pasado.title).toBe('Limpiar heladera')
    expect(parseQuickAdd('limpiar patio', [], NOW)).toMatchObject({ title: 'Limpiar patio', room: 'general' })
    expect(parseQuickAdd('colgar espejo!', [], NOW)).toMatchObject({ title: 'Colgar espejo', priority: 1 })
    const yLimpiar = parseQuickAdd('pintar con Nacho y limpiar', [], NOW)
    expect(yLimpiar.people).toEqual(['Nacho'])
    expect(yLimpiar.title).toBe('Pintar y limpiar')
    expect(parseQuickAdd('Pintar Con Rodillo', [], NOW).people).toEqual([])
    expect(parseQuickAdd('cambiar lamparita del pasillo', [], NOW).category).toBe('electricidad')
    const lunes = parseQuickAdd('ordenar placard el lunes que viene', [], NOW)
    expect(lunes).toMatchObject({ title: 'Ordenar placard', due: '2026-11-02' })
  })

  it('no confunde "con cable" con una persona', () => {
    const p = parseQuickAdd('armar conexión con cable canal para la tele', [], NOW)
    expect(p.people).toEqual([])
    expect(p.category).toBe('electricidad')
    expect(p.title).toBe('Armar conexión con cable canal para la tele')
  })

  it('acepta personas conocidas en minúscula', () => {
    const p = parseQuickAdd('pintar la reja con nacho', ['Nacho'], NOW)
    expect(p.people).toEqual(['Nacho'])
    expect(p.title).toBe('Pintar la reja')
  })

  it('entiende fechas relativas', () => {
    expect(parseQuickAdd('limpiar grifería mañana', [], NOW).due).toBe('2026-10-31')
    expect(parseQuickAdd('limpiar grifería hoy', [], NOW).due).toBe('2026-10-30')
    expect(parseQuickAdd('ordenar placard el finde', [], NOW).due).toBe('2026-10-31')
    expect(parseQuickAdd('ordenar placard el lunes', [], NOW).due).toBe('2026-11-02')
    expect(parseQuickAdd('vender mesas de luz mañana', [], NOW).title).toBe('Vender mesas de luz')
  })

  it('clasifica los pendientes reales', () => {
    expect(parseQuickAdd('Vender las mesas de luz', [], NOW)).toMatchObject({ category: 'venta', room: 'pieza' })
    expect(parseQuickAdd('Arreglar pastina de la bañera', [], NOW)).toMatchObject({ category: 'arreglo', room: 'bano' })
    expect(parseQuickAdd('Limpiar grifería de los baños', [], NOW)).toMatchObject({ category: 'limpieza', room: 'bano' })
    expect(parseQuickAdd('Acomodar tornillos en la maleta', [], NOW)).toMatchObject({ category: 'orden', room: 'taller' })
    expect(parseQuickAdd('Armar cable y cablear luz bajo mesada', [], NOW)).toMatchObject({ category: 'electricidad', room: 'cocina' })
  })

  it('sugiere materiales y usa tiempo por defecto del tipo', () => {
    const p = parseQuickAdd('colgar la tele en la pieza', [], NOW)
    expect(p.materials).toContain('Soporte para TV')
    expect(p.minutesDetected).toBe(false)
    expect(p.minutes).toBe(45)
  })

  it('sin pistas cae en general / otro', () => {
    const p = parseQuickAdd('llamar al plomero', [], NOW)
    expect(p.room).toBe('general')
    expect(p.roomDetected).toBe(false)
    expect(p.category).toBe('otro')
  })
})
