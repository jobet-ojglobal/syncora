import { Input } from "../ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldLabel } from "@/components/ui/field";

interface SearchInputProps {
  searchQuery: string;
  placeholder?: string;
  hasLabel?: boolean;
  setSearchQuery: (query: string) => void;
}

const SearchInput = ({
  searchQuery,
  placeholder = "Type to search...",
  hasLabel,
  setSearchQuery,
}: SearchInputProps) => {
  return (
    <Field>
      {hasLabel && <FieldLabel htmlFor="input-button-group">Search</FieldLabel>}
      <ButtonGroup>
        <Input
          id="input-button-group"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-xs"
        />
        {/* Optional: Clear button instead of Search button for live filtering */}
        {searchQuery && (
          <Button onClick={() => setSearchQuery("")} variant="outline">
            Clear
          </Button>
        )}
      </ButtonGroup>
    </Field>
  );
};

export default SearchInput;