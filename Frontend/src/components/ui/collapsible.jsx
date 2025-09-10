import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const CollapsibleContext = React.createContext();

const Collapsible = React.forwardRef(({ 
  className, 
  children, 
  open, 
  onOpenChange, 
  ...props 
}, ref) => {
  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange }}>
      <div
        ref={ref}
        className={cn('w-full', className)}
        {...props}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
});
Collapsible.displayName = 'Collapsible';

const useCollapsible = () => {
  const context = React.useContext(CollapsibleContext);
  if (!context) {
    throw new Error('Collapsible compound components must be rendered within the Collapsible component');
  }
  return context;
};

const CollapsibleTrigger = React.forwardRef(({ 
  className, 
  children, 
  asChild = false, 
  ...props 
}, ref) => {
  const { open, onOpenChange } = useCollapsible();
  
  if (asChild) {
    return React.cloneElement(React.Children.only(children), {
      onClick: () => onOpenChange(!open),
      ref,
      ...props
    });
  }
  
  return (
    <button
      ref={ref}
      className={cn(
        'flex items-center justify-between w-full transition-all [&[data-state=open]>svg]:rotate-180',
        className
      )}
      onClick={() => onOpenChange(!open)}
      {...props}
    >
      {children}
      <span className="h-4 w-4">
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </span>
    </button>
  );
});
CollapsibleTrigger.displayName = 'CollapsibleTrigger';

const CollapsibleContent = React.forwardRef(({ 
  className, 
  children, 
  ...props 
}, ref) => {
  const { open } = useCollapsible();
  
  return (
    <div
      ref={ref}
      className={cn(
        'overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
        className
      )}
      data-state={open ? 'open' : 'closed'}
      {...props}
    >
      {open && children}
    </div>
  );
});
CollapsibleContent.displayName = 'CollapsibleContent';

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
