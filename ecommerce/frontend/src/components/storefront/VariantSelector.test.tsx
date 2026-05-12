import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import VariantSelector, { OptionType, ProductVariant } from './VariantSelector'

const optionTypes: OptionType[] = [
  { id: 1, name: 'Size', position: 0, values: [{ id: 1, value: 'S' }, { id: 2, value: 'M' }, { id: 3, value: 'L' }] },
  { id: 2, name: 'Color', position: 1, values: [{ id: 4, value: 'Red' }, { id: 5, value: 'Blue' }] },
]

const variants: ProductVariant[] = [
  { id: 1, option_combination: { Size: 'S', Color: 'Red' }, price: 10, stock_quantity: 5, sku: null },
  { id: 2, option_combination: { Size: 'S', Color: 'Blue' }, price: 12, stock_quantity: 3, sku: null },
  { id: 3, option_combination: { Size: 'M', Color: 'Red' }, price: 15, stock_quantity: 0, sku: null },
  { id: 4, option_combination: { Size: 'M', Color: 'Blue' }, price: 14, stock_quantity: 7, sku: null },
  { id: 5, option_combination: { Size: 'L', Color: 'Red' }, price: 18, stock_quantity: 2, sku: null },
  { id: 6, option_combination: { Size: 'L', Color: 'Blue' }, price: 20, stock_quantity: 0, sku: null },
]

describe('VariantSelector', () => {
  it('renders all option types and values', () => {
    const onSelect = vi.fn()
    render(
      <VariantSelector
        optionTypes={optionTypes}
        variants={variants}
        selectedVariantId={null}
        onVariantSelect={onSelect}
      />
    )

    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByText('Color')).toBeInTheDocument()
    expect(screen.getByTestId('option-Size-S')).toBeInTheDocument()
    expect(screen.getByTestId('option-Size-M')).toBeInTheDocument()
    expect(screen.getByTestId('option-Size-L')).toBeInTheDocument()
    expect(screen.getByTestId('option-Color-Red')).toBeInTheDocument()
    expect(screen.getByTestId('option-Color-Blue')).toBeInTheDocument()
  })

  it('calls onVariantSelect with resolved variant when all options selected', () => {
    const onSelect = vi.fn()
    render(
      <VariantSelector
        optionTypes={optionTypes}
        variants={variants}
        selectedVariantId={null}
        onVariantSelect={onSelect}
      />
    )

    fireEvent.click(screen.getByTestId('option-Size-S'))
    fireEvent.click(screen.getByTestId('option-Color-Red'))

    // Should resolve to variant id=1 (Size: S, Color: Red, price: 10)
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, price: 10, stock_quantity: 5 })
    )
  })

  it('does not resolve variant when only partial selection made', () => {
    const onSelect = vi.fn()
    render(
      <VariantSelector
        optionTypes={optionTypes}
        variants={variants}
        selectedVariantId={null}
        onVariantSelect={onSelect}
      />
    )

    fireEvent.click(screen.getByTestId('option-Size-M'))

    // Should not call with a variant (only null for clearing)
    expect(onSelect).not.toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(Number) }))
  })

  it('shows out-of-stock badge for zero-stock variants', () => {
    const onSelect = vi.fn()
    render(
      <VariantSelector
        optionTypes={optionTypes}
        variants={variants}
        selectedVariantId={null}
        onVariantSelect={onSelect}
      />
    )

    // Select Size: M first, then Color: Red should be out of stock (variant id=3, stock=0)
    fireEvent.click(screen.getByTestId('option-Size-M'))

    const redButton = screen.getByTestId('option-Color-Red')
    expect(redButton).toBeDisabled()
    // OOS badge should be visible
    expect(redButton.querySelector('span')).toHaveTextContent('OOS')
  })

  it('disables out-of-stock variant buttons', () => {
    const onSelect = vi.fn()
    render(
      <VariantSelector
        optionTypes={optionTypes}
        variants={variants}
        selectedVariantId={null}
        onVariantSelect={onSelect}
      />
    )

    // Select Size: L, then Color: Blue should be disabled (variant id=6, stock=0)
    fireEvent.click(screen.getByTestId('option-Size-L'))

    const blueButton = screen.getByTestId('option-Color-Blue')
    expect(blueButton).toBeDisabled()
  })

  it('updates selection when user changes option', () => {
    const onSelect = vi.fn()
    render(
      <VariantSelector
        optionTypes={optionTypes}
        variants={variants}
        selectedVariantId={null}
        onVariantSelect={onSelect}
      />
    )

    // Select S + Red first
    fireEvent.click(screen.getByTestId('option-Size-S'))
    fireEvent.click(screen.getByTestId('option-Color-Red'))

    // Now change to Blue
    fireEvent.click(screen.getByTestId('option-Color-Blue'))

    // Should resolve to variant id=2 (Size: S, Color: Blue, price: 12)
    expect(onSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 2, price: 12, stock_quantity: 3 })
    )
  })

  it('renders option types in position order', () => {
    const reversed: OptionType[] = [
      { id: 2, name: 'Color', position: 1, values: [{ id: 4, value: 'Red' }] },
      { id: 1, name: 'Size', position: 0, values: [{ id: 1, value: 'S' }] },
    ]
    const onSelect = vi.fn()
    render(
      <VariantSelector
        optionTypes={reversed}
        variants={[{ id: 1, option_combination: { Size: 'S', Color: 'Red' }, price: 10, stock_quantity: 5, sku: null }]}
        selectedVariantId={null}
        onVariantSelect={onSelect}
      />
    )

    const labels = screen.getAllByText(/Size|Color/)
    expect(labels[0]).toHaveTextContent('Size')
    expect(labels[1]).toHaveTextContent('Color')
  })
})
