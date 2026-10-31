import { normalize } from './id'

/** Palabras clave → materiales que suelen hacer falta. */
const RULES: { match: RegExp; materials: string[] }[] = [
  { match: /\b(tele|tv|televisor)\b.*\b(colgar|soporte|montar)|\b(colgar|montar)\b.*\b(tele|tv|televisor)\b/, materials: ['Soporte para TV', 'Tarugos 8 mm', 'Mecha widia 8 mm', 'Nivel'] },
  { match: /cable ?canal/, materials: ['Cable canal', 'Cinta doble faz / tarugos'] },
  { match: /\b(toma|tomas|enchufe|enchufes)\b/, materials: ['Tomacorriente', 'Buscapolo'] },
  { match: /\b(toma|enchufe)\b.*\b(tele|tv)\b|\bconexion\b/, materials: ['Caja exterior', 'Cable 2,5 mm²'] },
  { match: /bajo mesada|tira led|\bled\b/, materials: ['Tira LED', 'Fuente 12 V', 'Cable bipolar', 'Interruptor o sensor'] },
  { match: /\bestante|\bestantes\b|repisa/, materials: ['Tarugos 8 mm', 'Tornillos', 'Nivel', 'Soportes'] },
  { match: /\bcuadro|\bcuadros\b/, materials: ['Ganchos para cuadros', 'Clavos o tarugos', 'Nivel'] },
  { match: /pastina|junta|azulejo/, materials: ['Pastina', 'Espátula de goma', 'Rasqueta', 'Silicona antihongos'] },
  { match: /griferia|canilla|grifo/, materials: ['Antisarro', 'Paño de microfibra'] },
  { match: /madera|tabla|lijar|barniz/, materials: ['Madera', 'Lija 120/220', 'Barniz', 'Soportes'] },
  { match: /tornillo|tornillos|maleta|organizar herramientas/, materials: ['Organizador con divisiones'] },
  { match: /cortina|barral|palo de la cortina/, materials: [] },
  { match: /pintar|pintura/, materials: ['Pintura', 'Rodillo', 'Cinta de papel', 'Lija'] },
  { match: /vender|publicar/, materials: [] },
  { match: /lampara|luz|foco/, materials: ['Lámpara / foco', 'Buscapolo'] },
]

export function suggestMaterials(title: string): string[] {
  const text = normalize(title)
  const out: string[] = []
  for (const rule of RULES) {
    if (rule.match.test(text)) {
      for (const m of rule.materials) if (!out.includes(m)) out.push(m)
    }
  }
  return out
}

export function materialKey(name: string): string {
  return normalize(name).replace(/\s+/g, ' ')
}
