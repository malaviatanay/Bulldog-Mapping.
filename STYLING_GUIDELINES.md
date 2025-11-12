# Styling Guidelines

## Theme System

### Colors
- Define colors as CSS custom properties in `globals.css` under `@theme inline`
- Format: `--color-<name>` (e.g., `--color-highlight`, `--color-highlight-hover`)
- Access in Tailwind as utility classes: `bg-highlight`, `text-highlight-hover`
- Current theme colors:
  - `--color-highlight: #dc2626` (red-600)
  - `--color-highlight-hover: #c72020` (slightly darker, ~20% toward red-700)

### Custom Easing
- **ALWAYS** use custom ease curves from the theme
- Available curves: `ease-out-1` through `ease-out-6`, `ease-in-1` through `ease-in-6`, `ease-in-out-1` through `ease-in-out-6`
- **Default for UI interactions**: `ease-out-2`
- **NEVER** use default easing like `ease-in-out` without a number

### Transitions
- Use arbitrary values with **underscores** instead of commas
  - ✅ Correct: `transition-[transform_background-color]`
  - ❌ Wrong: `transition-[transform, background-color]`
- Avoid transitioning shadows for performance - keep shadows static
- Always specify duration with custom ease: `duration-150 ease-out-2`

### Animations
- Define keyframe animations in `globals.css` with `@keyframes`
- Reference as CSS variables: `--animate-<name>`
- Use as Tailwind classes: `animate-image-intro`

## Component Architecture

### Props
- Always include `className?: string` prop for flexibility
- Use TypeScript types for all props

### React Patterns
- Use `key` prop to force remounts when animations need to retrigger
- When data changes (like `selectedBuilding.id`), use it as the key to remount components

### Client Components
- Mark interactive components with `'use client'` or `"use client"`

## Component Styling

### Buttons
- Include hover and active states: `hover:scale-105 active:scale-95`
- Always add `cursor-pointer`
- Use `group` and `group-hover` for parent-child hover relationships
- Consistent transitions on all interactive elements
- **Add depth to highlight buttons**: Use `button-depth` class for 3D effect
  - Adds 1px darker border (`border-highlight-hover`)
  - Adds inner box shadow (inset 0 1px 2px)
  - Adds top 50% gradient overlay via ::after pseudo-element
- Example:
  ```tsx
  className="button-depth bg-highlight hover:bg-highlight-hover border border-highlight-hover transition-[transform_background-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95"
  ```

### Cards & Containers
- Let cards handle their own layout - don't over-structure from parent wrappers
- Remove redundant styling when components are nested
- Use subtle borders instead of heavy shadows
- Border style: `border border-neutral-200` on white backgrounds

### Shadows & Borders
- **Prefer borders over shadows** for floating/card-style elements
- Use `border border-neutral-200` for white backgrounds
- Shadow guideline: Use small shadows or none at all
- Never use heavy shadows like `shadow-2xl` unless absolutely necessary

### Form Inputs
- **Style**: Clean, neutral Shadcn/Apple aesthetic
- **No red highlights on form inputs** - use neutral focus states only
- Border: `border border-neutral-200 rounded-lg`
- Remove default outline: `outline-none`
- Focus state: `focus:border-neutral-400` (neutral, not highlight red)
- Transitions: `transition-colors duration-150 ease-out-2`
- Add `cursor-pointer` for select/date inputs
- **Buttons and badges CAN use highlight colors** - only the inputs themselves should be neutral
- Submit buttons: Use `bg-highlight hover:bg-highlight-hover` with scale transforms
- Tag badges: Use `bg-highlight` with `hover:bg-highlight-hover` on close button

### Icons & Images
- Use lucide-react for icons
- Use Next.js Image component for images with proper sizing
- Add fallback icons when images don't exist
- **NO EMOJIS** unless explicitly requested

### Text Alignment
- **Default to left-aligned text**
- Only center text when explicitly specified
- Never center text by default for LLM-generated content

### Responsive Design
- Mobile-first approach
- Use `sm:` prefix for desktop breakpoints (640px+)
- Hide/show elements: `hidden sm:flex`
- Use `calc()` for complex responsive sizing
- Example: `h-[calc(100%-5.5rem)]`

## File Organization

### No Unnecessary Files
- **NEVER** create files unless absolutely necessary
- **ALWAYS** prefer editing existing files to creating new ones
- Don't create markdown/README files unless explicitly requested

### Import Organization
- Group imports logically:
  1. External libraries
  2. Local imports

## Code Quality

### Consistency
- Apply same hover/active patterns across all similar components
- Use same animation patterns across similar UI elements
- Maintain visual hierarchy (vertical layouts for better readability)

### Performance
- Don't transition shadows
- Keep animations lightweight
- Use CSS transforms for better performance

## Examples

### Button with All Conventions
```tsx
<button
  onClick={handleClick}
  className="bg-highlight text-white px-4 py-2 rounded-lg hover:bg-highlight-hover transition-[transform_background-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95"
>
  Click Me
</button>
```

### Input with All Conventions
```tsx
<input
  name="name"
  value={value}
  onChange={handleChange}
  placeholder="Enter name"
  className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 transition-colors duration-150 ease-out-2"
/>
```

### Submit Button (With Highlight & Depth)
```tsx
<button
  type="submit"
  className="button-depth w-full bg-highlight text-white py-2 rounded-lg border border-highlight-hover hover:bg-highlight-hover transition-[transform_background-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95"
>
  Submit
</button>
```

### Card Container
```tsx
<div className="bg-white rounded-xl border border-neutral-200 p-4">
  {/* Content */}
</div>
```

### Icon Button with Group Hover
```tsx
<button className="group p-2 rounded-lg hover:bg-highlight transition-[transform_background-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95">
  <Search className="w-5 h-5 group-hover:text-white transition-colors duration-150 ease-out-2" />
</button>
```