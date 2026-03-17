interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const SIZES = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export default function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-[#0000EB] ${SIZES[size]}`} />
      {label && <span className="text-sm text-gray-600">{label}</span>}
    </div>
  );
}
