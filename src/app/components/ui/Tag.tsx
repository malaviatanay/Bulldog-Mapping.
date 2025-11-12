'use client'

type TagVariant = 'building' | 'event';

type TagProps = {
  variant: TagVariant;
  className?: string;
};

const variantStyles: Record<TagVariant, string> = {
  building: 'bg-blue-500 hover:bg-blue-600 text-white',
  event: 'bg-highlight hover:bg-highlight-hover text-white',
};

const variantLabels: Record<TagVariant, string> = {
  building: 'Building',
  event: 'Event',
};

export default function Tag({ variant, className = "" }: TagProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-150 ease-out-2 ${variantStyles[variant]} ${className}`}
    >
      {variantLabels[variant]}
    </span>
  );
}
