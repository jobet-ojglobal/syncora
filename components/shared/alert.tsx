import { AlertCircleIcon } from "lucide-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

interface AlertProp {
  title: string;
  description: string;
  variant: "default" | "destructive" | null | undefined;
}

export function DynamicAlert({ title = "Alert title", description = "This is a description.", variant = "default"} : AlertProp) {
  return (
    <Alert variant={variant} className="w-full">
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        { description }
      </AlertDescription>
    </Alert>
  )
}
