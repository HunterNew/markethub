import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Plus, Trash2, Layers, Sparkles, Save, AlertCircle } from 'lucide-react'
import api from '../../api/client'
import toast from '../ui/Toast'

interface OptionType {
  name: string
  values: string[]
}

interface Variant {
  optionValues: Record<string, string>
  price: number
  stockQuantity: number
  sku: string
}

interface VariantConfigPanelProps {
  productId: number | null
  categoryId: string
  onSaved?: () => void
}

export interface VariantConfigPanelRef {
  saveIfNeeded: () => Promise<boolean>
  hasUnsavedVariants: () => boolean
}

const VariantConfigPanel = forwardRef<VariantConfigPanelRef, VariantConfigPanelProps>(({ productId, categoryId, onSaved }, ref) => {
  const [enabled, setEnabled] = useState(false)
  const [optionTypes, setOptionTypes] = useState<OptionType[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Expose save method to parent via ref
  useImperativeHandle(ref, () => ({
    saveIfNeeded: async () => {
      if (!productId || !enabled || !dirty || variants.length === 0) return true
      return await doSave()
    },
    hasUnsavedVariants: () => enabled && dirty && variants.length > 0
  }))

  const doSave = async (): Promise<boolean> => {
    if (!productId) return false
    setSaving(true)
    try {
      const validOptions = optionTypes.filter(ot => ot.name && ot.values.length > 0)
      const payload = {
        optionTypes: validOptions.map((ot, i) => ({
          name: ot.name,
          position: i + 1,
          values: ot.values
        })),
        variants: variants.map(v => ({
          optionValues: v.optionValues,
          price: Number(v.price),
          stockQuantity: Number(v.stockQuantity),
          ...(v.sku ? { sku: v.sku } : {})
        }))
      }
      await api.put(`/vendor/products/${productId}/variants`, payload)
      setDirty(false)
      onSaved?.()
      return true
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save variants')
      return false
    } finally {
      setSaving(false)
    }
  }

  // Load existing variant config when editing a product
  useEffect(() => {
    if (!productId) {
      setLoaded(true)
      return
    }
    api.get(`/vendor/products/${productId}/variants`)
      .then(res => {
        const data = res.data
        if (data.optionTypes && data.optionTypes.length > 0) {
          setEnabled(true)
          setOptionTypes(data.optionTypes.map((ot: any) => ({
            name: ot.name,
            values: ot.values.map((v: any) => v.value)
          })))
          if (data.variants && data.variants.length > 0) {
            setVariants(data.variants.map((v: any) => {
              const optComb = typeof v.option_combination === 'string'
                ? JSON.parse(v.option_combination)
                : (v.option_combination || {})
              return {
                optionValues: optComb,
                price: Number(v.price),
                stockQuantity: Number(v.stock_quantity),
                sku: v.sku || ''
              }
            }))
          }
        }
      })
      .catch(() => { /* no variants yet */ })
      .finally(() => setLoaded(true))
  }, [productId])

  // Fetch category suggestions when enabled and categoryId changes
  const fetchSuggestions = useCallback(async () => {
    if (!categoryId || !enabled) return
    setLoadingSuggestions(true)
    try {
      const res = await api.get(`/categories/${categoryId}/variant-suggestions`)
      const suggestions = res.data.suggestions
      if (suggestions && suggestions.length > 0 && optionTypes.length === 0) {
        setOptionTypes(suggestions.slice(0, 3).map((s: any) => ({
          name: s.name,
          values: s.values || []
        })))
      }
    } catch { /* no suggestions available */ }
    finally { setLoadingSuggestions(false) }
  }, [categoryId, enabled, optionTypes.length])

  useEffect(() => {
    if (enabled && categoryId && optionTypes.length === 0 && loaded) {
      fetchSuggestions()
    }
  }, [enabled, categoryId, loaded])

  const addOptionType = () => {
    if (optionTypes.length >= 3) return
    setOptionTypes([...optionTypes, { name: '', values: [] }])
  }

  const removeOptionType = (index: number) => {
    setOptionTypes(optionTypes.filter((_, i) => i !== index))
    setVariants([])
  }

  const updateOptionName = (index: number, name: string) => {
    const updated = [...optionTypes]
    updated[index] = { ...updated[index], name }
    setOptionTypes(updated)
  }

  const updateOptionValues = (index: number, valuesStr: string) => {
    const updated = [...optionTypes]
    const values = valuesStr.split(',').map(v => v.trim()).filter(v => v)
    updated[index] = { ...updated[index], values }
    setOptionTypes(updated)
  }

  const generateVariants = () => {
    const validOptions = optionTypes.filter(ot => ot.name && ot.values.length > 0)
    if (validOptions.length === 0) {
      toast.error('Add at least one option type with values')
      return
    }

    // Compute cartesian product
    const cartesian = (arrays: string[][]): string[][] => {
      if (arrays.length === 0) return [[]]
      return arrays.reduce<string[][]>(
        (acc, curr) => acc.flatMap(a => curr.map(v => [...a, v])),
        [[]]
      )
    }

    const valueArrays = validOptions.map(ot => ot.values)
    const combinations = cartesian(valueArrays)

    const newVariants: Variant[] = combinations.map(combo => {
      const optionValues: Record<string, string> = {}
      validOptions.forEach((ot, i) => {
        optionValues[ot.name] = combo[i]
      })
      // Preserve existing variant data if option values match
      const existing = variants.find(v =>
        JSON.stringify(v.optionValues) === JSON.stringify(optionValues)
      )
      return existing || { optionValues, price: 0, stockQuantity: 0, sku: '' }
    })

    setVariants(newVariants)
    setDirty(true)
  }

  const updateVariantField = (index: number, field: keyof Variant, value: any) => {
    const updated = [...variants]
    updated[index] = { ...updated[index], [field]: value }
    setVariants(updated)
    setDirty(true)
  }

  const saveVariants = async () => {
    const success = await doSave()
    if (success) {
      toast.success('Variants saved successfully!')
    }
  }

  if (!loaded) return null

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <label className="flex items-center gap-2 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          className="accent-primary-500 w-4 h-4"
        />
        <span className="font-medium text-sm flex items-center gap-1">
          <Layers size={14} className="text-purple-500" /> Enable Product Variants
        </span>
      </label>

      {enabled && (
        <div className="space-y-4 mt-3">
          {/* New product note */}
          {!productId && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Variants can be configured after the product is created. Save the product first, then edit it to set up variants.
              </p>
            </div>
          )}

          {/* Option Types */}
          {productId && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="label text-xs mb-0">Option Types (max 3)</label>
                  {optionTypes.length < 3 && (
                    <button
                      type="button"
                      onClick={addOptionType}
                      className="text-xs text-primary-500 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Option
                    </button>
                  )}
                </div>

                {loadingSuggestions && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Sparkles size={12} className="animate-pulse" /> Loading suggestions...
                  </div>
                )}

                {optionTypes.map((ot, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        className="input text-sm flex-1"
                        value={ot.name}
                        onChange={e => updateOptionName(i, e.target.value)}
                        placeholder="Option name (e.g., Size, Color)"
                      />
                      <button
                        type="button"
                        onClick={() => removeOptionType(i)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input
                      className="input text-sm"
                      value={ot.values.join(', ')}
                      onChange={e => updateOptionValues(i, e.target.value)}
                      placeholder="Values (comma-separated, e.g., S, M, L, XL)"
                    />
                  </div>
                ))}
              </div>

              {/* Generate button */}
              {optionTypes.length > 0 && (
                <button
                  type="button"
                  onClick={generateVariants}
                  className="btn-secondary text-sm w-full justify-center"
                >
                  <Layers size={14} /> Generate Variants
                </button>
              )}

              {/* Variant Grid */}
              {variants.length > 0 && (
                <div className="space-y-2">
                  <label className="label text-xs">Variant Combinations ({variants.length})</label>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {optionTypes.filter(ot => ot.name).map(ot => (
                            <th key={ot.name} className="text-left py-2 px-3 text-xs font-medium text-gray-500">{ot.name}</th>
                          ))}
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Price (₹)</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Stock</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">SKU</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {variants.map((v, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {optionTypes.filter(ot => ot.name).map(ot => (
                              <td key={ot.name} className="py-2 px-3 text-xs text-gray-700">
                                {v.optionValues[ot.name] || '—'}
                              </td>
                            ))}
                            <td className="py-1 px-2">
                              <input
                                type="number"
                                className="input text-xs py-1 px-2 w-20"
                                value={v.price || ''}
                                onChange={e => updateVariantField(i, 'price', e.target.value)}
                                placeholder="0"
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="py-1 px-2">
                              <input
                                type="number"
                                className="input text-xs py-1 px-2 w-16"
                                value={v.stockQuantity || ''}
                                onChange={e => updateVariantField(i, 'stockQuantity', e.target.value)}
                                placeholder="0"
                                min="0"
                              />
                            </td>
                            <td className="py-1 px-2">
                              <input
                                type="text"
                                className="input text-xs py-1 px-2 w-24"
                                value={v.sku}
                                onChange={e => updateVariantField(i, 'sku', e.target.value)}
                                placeholder="Optional"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Save button */}
              {variants.length > 0 && (
                <button
                  type="button"
                  onClick={saveVariants}
                  disabled={saving}
                  className="btn-primary text-sm w-full justify-center"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Save size={14} /> Save Variants</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
})

export default VariantConfigPanel
