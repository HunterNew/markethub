import React, { useState, useMemo } from 'react'

export interface OptionType {
  id: number
  name: string
  position: number
  values: { id: number; value: string }[]
}

export interface ProductVariant {
  id: number
  option_combination: Record<string, string>
  price: number
  stock_quantity: number
  sku: string | null
}

interface VariantSelectorProps {
  optionTypes: OptionType[]
  variants: ProductVariant[]
  selectedVariantId: number | null
  onVariantSelect: (variant: ProductVariant | null) => void
}

export default function VariantSelector({
  optionTypes,
  variants,
  selectedVariantId,
  onVariantSelect,
}: VariantSelectorProps) {
  const [selections, setSelections] = useState<Record<string, string>>({})

  // Resolve variant from current selections
  const resolvedVariant = useMemo(() => {
    if (Object.keys(selections).length !== optionTypes.length) return null
    return variants.find(v => {
      return optionTypes.every(ot => v.option_combination[ot.name] === selections[ot.name])
    }) || null
  }, [selections, optionTypes, variants])

  // Notify parent when resolved variant changes
  React.useEffect(() => {
    const currentId = resolvedVariant?.id ?? null
    if (currentId !== selectedVariantId) {
      onVariantSelect(resolvedVariant)
    }
  }, [resolvedVariant])

  const handleSelect = (optionName: string, value: string) => {
    setSelections(prev => ({ ...prev, [optionName]: value }))
  }

  // Check if a specific value leads to an out-of-stock variant
  const isValueOutOfStock = (optionName: string, value: string): boolean => {
    const hypothetical = { ...selections, [optionName]: value }
    // Only check if all options would be selected
    if (Object.keys(hypothetical).length !== optionTypes.length) return false
    const match = variants.find(v =>
      optionTypes.every(ot => v.option_combination[ot.name] === hypothetical[ot.name])
    )
    return match ? match.stock_quantity === 0 : false
  }

  return (
    <div className="space-y-4" data-testid="variant-selector">
      {optionTypes
        .sort((a, b) => a.position - b.position)
        .map(ot => (
          <div key={ot.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {ot.name}
              {selections[ot.name] && (
                <span className="ml-2 text-gray-500 font-normal">: {selections[ot.name]}</span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {ot.values.map(val => {
                const isSelected = selections[ot.name] === val.value
                const outOfStock = isValueOutOfStock(ot.name, val.value)

                return (
                  <button
                    key={val.id}
                    type="button"
                    onClick={() => handleSelect(ot.name, val.value)}
                    disabled={outOfStock}
                    className={`
                      relative px-4 py-2 rounded-lg text-sm font-medium border transition-all
                      ${isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                        : outOfStock
                          ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                    data-testid={`option-${ot.name}-${val.value}`}
                  >
                    {val.value}
                    {outOfStock && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
                        OOS
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
    </div>
  )
}
