import { FolderTree } from "lucide-react";

const PageHeader = ({ title = "Page Title", description = "This is a description.", children, className } : { 
    title: string, 
    description?: string,
    children?: React.ReactNode; 
    icon?: React.ReactNode; 
    className?: string; 
}) => {
    return ( 
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
        <div>
          <h1 className="text-xl font-bold tracking-tight"> { title }</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{ description }</p>
        </div>
        {
          children
        }
      </div>
     );
}
 
export default PageHeader;