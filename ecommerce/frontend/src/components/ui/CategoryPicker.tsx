import { useState, useRef, useEffect } from 'react'
import { ChevronRight, Plus } from 'lucide-react'

interface Category {
  id: number
  name: string
  parent_id: number | null
  status?: string
}

interface CategoryPickerProps {
  categories: Category[]
  value: string
  onChange: (categoryId: string) => void
  placeholder?: string
  onRequestCategory?: (parentId: number | null) => void
}

export default function CategoryPicker({ categories, value, onChange, placeholder = 'Select category', onRequestCategory }: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  // Build breadcrumb path for selected category
  const getPath = (catId: number | null): Category[] => {
    if (!catId) return []
    const cat = categories.find(c => c.id === catId)
    if (!cat) return []
    return [...getPath(cat.parent_id), cat]
  }

  const selectedCategory = categories.find(c => c.id === Number(value))
  const path = selectedCategory ? getPath(selectedCategory.id) : []
  const displayText = path.map(c => c.name).join(' › ')

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto-expand parents of selected value
  useEffect(() => {
    if (selectedCategory) {
      const ids = new Set<number>()
      let current = selectedCategory
      while (current?.parent_id) {
        ids.add(current.parent_id)
        current = categories.find(c => c.id === current!.parent_id) as Category
      }
      setExpandedIds(prev => new Set([...prev, ...ids]))
    }
  }, [selectedCategory, categories])

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getChildren = (parentId: number | null) => {
    return categories.filter(c => c.parent_id === parentId && c.status !== 'rejected')
  }

  // Recursive tree node
  function TreeNode({ cat, depth }: { cat: Category; depth: number }) {
    const children = getChildren(cat.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedIds.has(cat.id)
    const isSelected = Number(value) === cat.id

    return (
      <div>
        <div
          className={`flex items-center gap-1 py-2 pr-3 cursor-pointer hover:bg-primary-50 transition-colors rounded-md ${isSelected ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {/* Expand arrow */}
          {hasChildren ? (
            <button type="button" onClick={(e) => { e.stopPropagation(); toggleExpand(cat.id) }} className="p-0.5 hover:bg-gray-200 rounded">
              <ChevronRight size={12} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          ) : (
            <span className="w-4" />
          )}
          {/* Category name - clickable to select */}
          <button type="button" className="flex-1 text-left text-sm truncate" onClick={() => { onChange(String(cat.id)); setIsOpen(false) }}>
            {cat.name}
          </button>
        </div>
        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {children.map(child => <TreeNode key={child.id} cat={child} depth={depth + 1} />)}
            {/* Request new sub-category at this level */}
            {onRequestCategory && (
              <button
                type="button"
                onClick={() => { onRequestCategory(cat.id); setIsOpen(false) }}
                className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-700 py-1.5 hover:bg-primary-50 rounded-md transition-colors"
                style={{ paddingLeft: `${(depth + 1) * 16 + 12}px` }}
              >
                <Plus size={10} /> Request subcategory
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  const rootCategories = getChildren(null)

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="input w-full text-left flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={displayText ? 'text-gray-900 text-sm truncate' : 'text-gray-400 text-sm'}>
          {displayText || placeholder}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto py-1">
          {/* Clear option */}
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 rounded-md"
            onClick={() => { onChange(''); setIsOpen(false) }}
          >
            {placeholder}
          </button>

          {/* Recursive tree */}
          {rootCategories.map(cat => <TreeNode key={cat.id} cat={cat} depth={0} />)}

          {/* Request new top-level category */}
          {onRequestCategory && (
            <button
              type="button"
              onClick={() => { onRequestCategory(null); setIsOpen(false) }}
              className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-700 px-3 py-2 hover:bg-primary-50 rounded-md w-full text-left mt-1 border-t border-gray-100"
            >
              <Plus size={10} /> Can't find your category? Request one
            </button>
          )}
        </div>
      )}
    </div>
  )
}
