
interface PageHeaderProps {
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
  // Change to an icon component type so it can accept Lucide icons cleanly
  icon?: React.ComponentType<{ className?: string }>; 
  className?: string;
}

const PageHeader = ({ 
  title = "Page Title", 
  description = "This is a description.", 
  children, 
  icon: Icon, // Remap lower-case 'icon' to Capitalized 'Icon'
  className = "" 
}: PageHeaderProps) => {
  return ( 
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-primary shrink-0" />} 
          <span className="flex items-center flex-wrap gap-1.5">{title}</span>
        </h1>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
 
export default PageHeader;