'use client'

interface Category {
  id: string
  name: string
  emoji: string
  color?: string
}

interface CategoryListProps {
  categories: Category[]
  onSelectCategory: (category: Category) => void
}

export function CategoryList({ categories, onSelectCategory }: CategoryListProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {categories.map((category) => (
        <button
          key={category.id}
          className="flex items-center gap-2 rounded-lg border p-4 text-left hover:bg-accent"
          onClick={() => onSelectCategory(category)}
        >
          {category.emoji}
          <span>{category.name}</span>
        </button>
      ))}
    </div>
  )
} 