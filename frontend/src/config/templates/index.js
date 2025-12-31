/**
 * Templates Index
 * Exports all available templates
 */

import defaultTemplate from './default.json'
import christmasTemplate from './christmas.json'
import diwaliTemplate from './diwali.json'
import holiTemplate from './holi.json'

const templates = [
  defaultTemplate,
  christmasTemplate,
  diwaliTemplate,
  holiTemplate
]

// Create a map for quick lookup
const templatesMap = templates.reduce((acc, template) => {
  acc[template.id] = template
  return acc
}, {})

// Get template by ID
export const getTemplate = (id) => {
  return templatesMap[id] || templatesMap['default']
}

// Get all templates
export const getAllTemplates = () => templates

// Get templates by category
export const getTemplatesByCategory = (category) => {
  return templates.filter(t => t.category === category)
}

// Get festival templates
export const getFestivalTemplates = () => {
  return getTemplatesByCategory('festival')
}

// Get non-festival templates
export const getNonFestivalTemplates = () => {
  return getTemplatesByCategory('non-festival')
}

export default templates








