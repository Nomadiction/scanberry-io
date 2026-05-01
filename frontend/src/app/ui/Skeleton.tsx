import { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
};

export const SkeletonCard = () => {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex-1 px-4 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <Skeleton className="h-[22px] w-16 rounded-md" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="flex items-end gap-5 mb-2.5">
            <div>
              <Skeleton className="h-2.5 w-14 mb-1" />
              <Skeleton className="h-[18px] w-12" />
            </div>
            <div>
              <Skeleton className="h-2.5 w-11 mb-1" />
              <Skeleton className="h-[18px] w-10" />
            </div>
            <div>
              <Skeleton className="h-2.5 w-8 mb-1" />
              <Skeleton className="h-[18px] w-9" />
            </div>
          </div>
          <Skeleton className="h-[3px] w-full rounded-full" />
        </div>
      </div>
    </div>
  );
};
